import { cameraX, cameraY, cameraScale } from "../game/camera.js";
import { CollisionType, Collision, StaticMap } from "../map/map.js";
import { currentWeather } from "../map/weather.js";
import { clientPlayer } from "./client-player.js";
import { Rig } from "./rig.js";

class Particle {
    id = Math.random();
    x: number;
    y: number;

    firstUpdate = true;

    static list = new Map<number, Particle>();

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;

        Particle.list.set(this.id, this);
    }

    update(frameTime: number) {
    }
    draw(belowCtx: OffscreenCanvasRenderingContext2D, aboveCtx: OffscreenCanvasRenderingContext2D) {
    }
    remove() {
        Particle.list.delete(this.id);
    }

    static updateAll(frameTime: number) {
        for (let [_, particle] of Particle.list) {
            if (particle.firstUpdate) {
                particle.firstUpdate = false;
                continue;
            }
            particle.update(frameTime);
        }
    }
    static drawAll(belowCtx: OffscreenCanvasRenderingContext2D, aboveCtx: OffscreenCanvasRenderingContext2D) {
        for (let [_, particle] of Particle.list) {
            particle.draw(belowCtx, aboveCtx);
        }
    }
}

class GravityParticle extends Particle {
    rotation: number;

    speedX: number;
    speedY: number;
    speedRotation: number;

    decayX: number;
    decayY: number;
    decayRotation: number;

    gravity: number;

    timer: number;
    totalTime: number;

    constructor(x: number, y: number, rotation: number, speedX: number, speedY: number, speedRotation: number, decayX: number, decayY: number, decayRotation: number, gravity: number, totalTime: number) {
        super(x, y);

        this.rotation = rotation;

        this.speedX = speedX;
        this.speedY = speedY;
        this.speedRotation = speedRotation;

        this.decayX = decayX;
        this.decayY = decayY;
        this.decayRotation = decayRotation;

        this.gravity = gravity;

        this.timer = totalTime;
        this.totalTime = totalTime;
    }
    update(frameTime: number) {
        this.timer -= frameTime;
        if (this.timer <= 0) {
            this.remove();
            return;
        }
        this.speedX *= Math.pow(1 - this.decayX, frameTime);
        this.speedY *= Math.pow(1 - this.decayY, frameTime);
        this.speedY += this.gravity * frameTime;
        this.speedRotation *= Math.pow(1 - this.decayRotation, frameTime);
        this.x += this.speedX * frameTime;
        this.y += this.speedY * frameTime;
        this.rotation += this.speedRotation * frameTime;
    }
}
class CollisionGravityParticle extends GravityParticle {
    width: number;
    height: number;

    collided = false;

    constructor(x: number, y: number, width: number, height: number, rotation: number, speedX: number, speedY: number, speedRotation: number, decayX: number, decayY: number, decayRotation: number, gravity: number, totalTime: number) {
        super(x, y, rotation, speedX, speedY, speedRotation, decayX, decayY, decayRotation, gravity, totalTime);
        this.width = width;
        this.height = height;
    }
    update(frameTime: number) {
        this.timer -= frameTime;
        if (this.timer <= 0) {
            this.remove();
            return;
        }
        this.speedX *= Math.pow(1 - this.decayX, frameTime);
        this.speedY *= Math.pow(1 - this.decayY, frameTime);
        this.speedY += this.gravity * frameTime;
        this.speedRotation *= Math.pow(1 - this.decayRotation, frameTime);
        this.move(frameTime);
        this.rotation += this.speedRotation * frameTime;
    }
    move(frameTime: number) {
        let timeRemaining = frameTime;
        let times = 0;
        // let liquid = this.isCollidingWithMapLiquid() / this.width / this.height;
        while (timeRemaining > 0) {
            // let planeX = Math.max(Math.sign(this.speedX), -1e-10);
            // let planeY = Math.max(Math.sign(this.speedY), -1e-10);
            let planeX = Math.max(Math.sign(this.speedX), 0);
            let planeY = Math.max(Math.sign(this.speedY), 0);
            // let planeX = Math.sign(this.speedX);
            // let planeY = Math.sign(this.speedY);
            let inverseSpeedX = 1 / this.speedX;
            let inverseSpeedY = 1 / this.speedY;
            let frontX = this.x + this.width / 2 * Math.sign(this.speedX);
            let frontY = this.y + this.height / 2 * Math.sign(this.speedY);
            let distanceX = (planeX - (frontX - Math.floor(frontX)));
            let distanceY = (planeY - (frontY - Math.floor(frontY)));
            if (distanceX == 0) {
                distanceX = Math.sign(this.speedX);
            }
            if (distanceY == 0) {
                distanceY = Math.sign(this.speedY);
            }
            let timeX = distanceX * inverseSpeedX;
            let timeY = distanceY * inverseSpeedY;

            if (!isFinite(timeX)) {
                timeX = Infinity;
            }
            if (!isFinite(timeY)) {
                timeY = Infinity;
            }
            
            let lastX = this.x;
            let lastY = this.y;
            
            let time = Math.min(Math.min(timeX, timeY), timeRemaining);

            this.x += this.speedX * time;
            this.y += this.speedY * time;
            timeRemaining -= time;
            times += 1;
            if (times > 1000) {
                console.warn("moved >1000 times!")
                break;
            }
            this.collideWithMap(lastX, lastY);

            if (this.isCollidingWithMap(lastX, lastY)) {
                this.x = lastX;
                this.y = lastY;
            }

            if (this.speedX == 0 && this.speedY == 0) {
                break;
            }
        }
    }
    isCollidingWithCollision(collision: Collision, lastX: number, lastY: number) {
        switch (collision.type) {
            case CollisionType.Rectangle:
                if (this.x - this.width / 2 < collision.x + collision.width / 2 && this.x + this.width / 2 > collision.x - collision.width / 2 && this.y - this.height / 2 < collision.y + collision.height / 2 && this.y + this.height / 2 > collision.y - collision.height / 2) {
                    return true;
                }
                break;
            case CollisionType.TriangleTopLeft:
            case CollisionType.StairTopLeft:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return false;
                }
                // if (this.x + this.width / 2 <= collision.x - collision.width / 2) {
                //     return false;
                // }
                // if (this.y + this.height / 2 <= collision.y - collision.height / 2) {
                //     return false;
                // }
                if (this.y - this.height / 2 - collision.y >= -collision.height / collision.width * (this.x - this.width / 2 - collision.x) - 1e-10) {
                    return false;
                }
                return true;
            case CollisionType.TriangleTopRight:
            case CollisionType.StairTopRight:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return false;
                }
                // if (this.x - this.width / 2 >= collision.x + collision.width / 2) {
                //     return false;
                // }
                // if (this.y + this.height / 2 <= collision.y - collision.height / 2) {
                //     return false;
                // }
                if (this.y - this.height / 2 - collision.y >= collision.height / collision.width * (this.x + this.width / 2 - collision.x) - 1e-10) {
                    return false;
                }
                return true;
            case CollisionType.TriangleBottomLeft:
            case CollisionType.StairBottomLeft:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return false;
                }
                // if (this.x + this.width / 2 <= collision.x - collision.width / 2) {
                //     return false;
                // }
                // if (this.y - this.height / 2 >= collision.y + collision.height / 2) {
                //     return false;
                // }
                if (this.y + this.height / 2 - collision.y <= collision.height / collision.width * (this.x - this.width / 2 - collision.x) + 1e-10) {
                    return false;
                }
                return true;
            case CollisionType.TriangleBottomRight:
            case CollisionType.StairBottomRight:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return false;
                }
                // if (this.x - this.width / 2 >= collision.x + collision.width / 2) {
                //     return false;
                // }
                // if (this.y - this.height / 2 >= collision.y + collision.height / 2) {
                //     return false;
                // }
                if (this.y + this.height / 2 - collision.y <= -collision.height / collision.width * (this.x + this.width / 2 - collision.x) + 1e-10) {
                    return false;
                }
                return true;
        }
        return false;
    }
    collideWithCollision(collision: Collision, lastX: number, lastY: number) {
        switch (collision.type) {
            case CollisionType.Rectangle:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return;
                }
                this.collided = true;
                if (this.y - this.height / 2 < collision.y - collision.height / 2 && lastY + this.height / 2 <= collision.y - collision.height / 2) {
                    this.y = collision.y - collision.height / 2 - this.height / 2;
                    this.speedY = 0;
                    // this.onGround = 3;
                }
                else if (this.y + this.height / 2 > collision.y + collision.height / 2 && lastY - this.height / 2 >= collision.y + collision.height / 2) {
                    this.y = collision.y + collision.height / 2 + this.height / 2;
                    this.speedY = 0;
                }
                else if (this.x - this.width / 2 < collision.x - collision.width / 2 && lastX + this.width / 2 <= collision.x - collision.width / 2) {
                    this.x = collision.x - collision.width / 2 - this.width / 2;
                    this.speedX = 0;
                }
                else if (this.x + this.width / 2 > collision.x + collision.width / 2 && lastX - this.width / 2 >= collision.x + collision.width / 2) {
                    this.x = collision.x + collision.width / 2 + this.width / 2;
                    this.speedX = 0;
                }
                break;
            case CollisionType.TriangleTopLeft:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return;
                }
                // if (this.x + this.width / 2 <= collision.x - collision.width / 2) {
                //     return;
                // }
                // if (this.y + this.height / 2 <= collision.y - collision.height / 2) {
                //     return;
                // }
                if (this.y - this.height / 2 - collision.y >= -collision.height / collision.width * (this.x - this.width / 2 - collision.x) - 1e-10) {
                    return;
                }
                this.collided = true;
                if (this.y + this.height / 2 - collision.y > -collision.height / collision.width * (this.x + this.width / 2 - collision.x) && lastY - this.height / 2 - collision.y >= -collision.height / collision.width * (lastX - this.width / 2 - collision.x) - 1e-10) {
                    let cos = collision.width / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
                    let sin = collision.height / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
                    let distance = (this.y - this.height / 2 - collision.y + collision.height / collision.width * (this.x - this.width / 2 - collision.x)) * cos;
                    this.x -= distance * sin;
                    this.y -= distance * cos;
                    let perpendicular = -this.speedX * sin + -this.speedY * cos;
                    this.speedX += perpendicular * sin;
                    this.speedY += perpendicular * cos;
                }
                else if (this.y - this.height / 2 < collision.y - collision.height / 2 && lastY + this.height / 2 <= collision.y - collision.height / 2) {
                    this.y = collision.y - collision.height / 2 - this.height / 2;
                    this.speedY = 0;
                    // this.onGround = 3;
                }
                else if (this.y + this.height / 2 > collision.y + collision.height / 2 && lastY - this.height / 2 >= collision.y + collision.height / 2) {
                    this.y = collision.y + collision.height / 2 + this.height / 2;
                    this.speedY = 0;
                }
                else if (this.x - this.width / 2 < collision.x - collision.width / 2 && lastX + this.width / 2 <= collision.x - collision.width / 2) {
                    this.x = collision.x - collision.width / 2 - this.width / 2;
                    this.speedX = 0;
                }
                else if (this.x + this.width / 2 > collision.x + collision.width / 2 && lastX - this.width / 2 >= collision.x + collision.width / 2) {
                    this.x = collision.x + collision.width / 2 + this.width / 2;
                    this.speedX = 0;
                }
                break;
            case CollisionType.StairTopLeft:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return;
                }
                // if (this.x + this.width / 2 <= collision.x - collision.width / 2) {
                //     return;
                // }
                // if (this.y + this.height / 2 <= collision.y - collision.height / 2) {
                //     return;
                // }
                if (this.y - this.height / 2 - collision.y >= -collision.height / collision.width * (this.x - this.width / 2 - collision.x) - 1e-10) {
                    return;
                }
                this.collided = true;
                if (this.y + this.height / 2 - collision.y > -collision.height / collision.width * (this.x + this.width / 2 - collision.x) && lastY - this.height / 2 - collision.y >= -collision.height / collision.width * (lastX - this.width / 2 - collision.x) - 1e-10) {
                    let distance = this.y - this.height / 2 - collision.y + collision.height / collision.width * (this.x - this.width / 2 - collision.x);
                    this.y -= distance;
                    this.speedY = 0;
                }
                else if (this.y - this.height / 2 < collision.y - collision.height / 2 && lastY + this.height / 2 <= collision.y - collision.height / 2) {
                    this.y = collision.y - collision.height / 2 - this.height / 2;
                    this.speedY = 0;
                    // this.onGround = 3;
                }
                else if (this.y + this.height / 2 > collision.y + collision.height / 2 && lastY - this.height / 2 >= collision.y + collision.height / 2) {
                    this.y = collision.y + collision.height / 2 + this.height / 2;
                    this.speedY = 0;
                }
                else if (this.x - this.width / 2 < collision.x - collision.width / 2 && lastX + this.width / 2 <= collision.x - collision.width / 2) {
                    this.x = collision.x - collision.width / 2 - this.width / 2;
                    this.speedX = 0;
                }
                else if (this.x + this.width / 2 > collision.x + collision.width / 2 && lastX - this.width / 2 >= collision.x + collision.width / 2) {
                    this.x = collision.x + collision.width / 2 + this.width / 2;
                    this.speedX = 0;
                }
                break;
            case CollisionType.TriangleTopRight:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return;
                }
                // if (this.x - this.width / 2 >= collision.x + collision.width / 2) {
                //     return;
                // }
                // if (this.y + this.height / 2 <= collision.y - collision.height / 2) {
                //     return;
                // }
                if (this.y - this.height / 2 - collision.y >= collision.height / collision.width * (this.x + this.width / 2 - collision.x) - 1e-10) {
                    return;
                }
                this.collided = true;
                if (this.y + this.height / 2 - collision.y > collision.height / collision.width * (this.x - this.width / 2 - collision.x) && lastY - this.height / 2 - collision.y >= collision.height / collision.width * (lastX + this.width / 2 - collision.x) - 1e-10) {
                    let cos = collision.width / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
                    let sin = collision.height / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
                    let distance = (this.y - this.height / 2 - collision.y - collision.height / collision.width * (this.x + this.width / 2 - collision.x)) * cos;
                    this.x += distance * sin;
                    this.y -= distance * cos;
                    let perpendicular = this.speedX * sin + -this.speedY * cos;
                    this.speedX -= perpendicular * sin;
                    this.speedY += perpendicular * cos;
                }
                else if (this.y - this.height / 2 < collision.y - collision.height / 2 && lastY + this.height / 2 <= collision.y - collision.height / 2) {
                    this.y = collision.y - collision.height / 2 - this.height / 2;
                    this.speedY = 0;
                    // this.onGround = 3;
                }
                else if (this.y + this.height / 2 > collision.y + collision.height / 2 && lastY - this.height / 2 >= collision.y + collision.height / 2) {
                    this.y = collision.y + collision.height / 2 + this.height / 2;
                    this.speedY = 0;
                }
                else if (this.x - this.width / 2 < collision.x - collision.width / 2 && lastX + this.width / 2 <= collision.x - collision.width / 2) {
                    this.x = collision.x - collision.width / 2 - this.width / 2;
                    this.speedX = 0;
                }
                else if (this.x + this.width / 2 > collision.x + collision.width / 2 && lastX - this.width / 2 >= collision.x + collision.width / 2) {
                    this.x = collision.x + collision.width / 2 + this.width / 2;
                    this.speedX = 0;
                }
                break;
            case CollisionType.StairTopRight:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return;
                }
                // if (this.x - this.width / 2 >= collision.x + collision.width / 2) {
                //     return;
                // }
                // if (this.y + this.height / 2 <= collision.y - collision.height / 2) {
                //     return;
                // }
                if (this.y - this.height / 2 - collision.y >= collision.height / collision.width * (this.x + this.width / 2 - collision.x) - 1e-10) {
                    return;
                }
                this.collided = true;
                if (this.y + this.height / 2 - collision.y > collision.height / collision.width * (this.x - this.width / 2 - collision.x) && lastY - this.height / 2 - collision.y >= collision.height / collision.width * (lastX + this.width / 2 - collision.x) - 1e-10) {
                    let distance = this.y - this.height / 2 - collision.y - collision.height / collision.width * (this.x + this.width / 2 - collision.x);
                    this.y -= distance;
                    this.speedY = 0;
                }
                else if (this.y - this.height / 2 < collision.y - collision.height / 2 && lastY + this.height / 2 <= collision.y - collision.height / 2) {
                    this.y = collision.y - collision.height / 2 - this.height / 2;
                    this.speedY = 0;
                    // this.onGround = 3;
                }
                else if (this.y + this.height / 2 > collision.y + collision.height / 2 && lastY - this.height / 2 >= collision.y + collision.height / 2) {
                    this.y = collision.y + collision.height / 2 + this.height / 2;
                    this.speedY = 0;
                }
                else if (this.x - this.width / 2 < collision.x - collision.width / 2 && lastX + this.width / 2 <= collision.x - collision.width / 2) {
                    this.x = collision.x - collision.width / 2 - this.width / 2;
                    this.speedX = 0;
                }
                else if (this.x + this.width / 2 > collision.x + collision.width / 2 && lastX - this.width / 2 >= collision.x + collision.width / 2) {
                    this.x = collision.x + collision.width / 2 + this.width / 2;
                    this.speedX = 0;
                }
                break;
            case CollisionType.TriangleBottomLeft:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return;
                }
                // if (this.x + this.width / 2 <= collision.x - collision.width / 2) {
                //     return;
                // }
                // if (this.y - this.height / 2 >= collision.y + collision.height / 2) {
                //     return;
                // }
                if (this.y + this.height / 2 - collision.y <= collision.height / collision.width * (this.x - this.width / 2 - collision.x) + 1e-10) {
                    return;
                }
                this.collided = true;
                if (this.y - this.height / 2 - collision.y < collision.height / collision.width * (this.x + this.width / 2 - collision.x) && lastY + this.height / 2 - collision.y <= collision.height / collision.width * (lastX - this.width / 2 - collision.x) + 1e-10) {
                    let cos = collision.width / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
                    let sin = collision.height / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
                    let distance = (this.y + this.height / 2 - collision.y - collision.height / collision.width * (this.x - this.width / 2 - collision.x)) * cos;
                    this.x += distance * sin;
                    this.y -= distance * cos;
                    let perpendicular = -this.speedX * sin + this.speedY * cos;
                    this.speedX += perpendicular * sin;
                    this.speedY -= perpendicular * cos;
                    // this.onGround = 3;
                }
                else if (this.y - this.height / 2 < collision.y - collision.height / 2 && lastY + this.height / 2 <= collision.y - collision.height / 2) {
                    this.y = collision.y - collision.height / 2 - this.height / 2;
                    this.speedY = 0;
                    // this.onGround = 3;
                }
                else if (this.y + this.height / 2 > collision.y + collision.height / 2 && lastY - this.height / 2 >= collision.y + collision.height / 2) {
                    this.y = collision.y + collision.height / 2 + this.height / 2;
                    this.speedY = 0;
                }
                else if (this.x - this.width / 2 < collision.x - collision.width / 2 && lastX + this.width / 2 <= collision.x - collision.width / 2) {
                    this.x = collision.x - collision.width / 2 - this.width / 2;
                    this.speedX = 0;
                }
                else if (this.x + this.width / 2 > collision.x + collision.width / 2 && lastX - this.width / 2 >= collision.x + collision.width / 2) {
                    this.x = collision.x + collision.width / 2 + this.width / 2;
                    this.speedX = 0;
                }
                break;
            case CollisionType.StairBottomLeft:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return;
                }
                // if (this.x + this.width / 2 <= collision.x - collision.width / 2) {
                //     return;
                // }
                // if (this.y - this.height / 2 >= collision.y + collision.height / 2) {
                //     return;
                // }
                if (this.y + this.height / 2 - collision.y <= collision.height / collision.width * (this.x - this.width / 2 - collision.x) + 1e-10) {
                    return;
                }
                this.collided = true;
                if (this.y - this.height / 2 - collision.y < collision.height / collision.width * (this.x + this.width / 2 - collision.x) && lastY + this.height / 2 - collision.y <= collision.height / collision.width * (lastX - this.width / 2 - collision.x) + 1e-10) {
                    let distance = this.y + this.height / 2 - collision.y - collision.height / collision.width * (this.x - this.width / 2 - collision.x);
                    this.y -= distance;
                    this.speedY = 0;
                    // this.onGround = 3;
                }
                else if (this.y - this.height / 2 < collision.y - collision.height / 2 && lastY + this.height / 2 <= collision.y - collision.height / 2) {
                    this.y = collision.y - collision.height / 2 - this.height / 2;
                    this.speedY = 0;
                    // this.onGround = 3;
                }
                else if (this.y + this.height / 2 > collision.y + collision.height / 2 && lastY - this.height / 2 >= collision.y + collision.height / 2) {
                    this.y = collision.y + collision.height / 2 + this.height / 2;
                    this.speedY = 0;
                }
                else if (this.x - this.width / 2 < collision.x - collision.width / 2 && lastX + this.width / 2 <= collision.x - collision.width / 2) {
                    this.x = collision.x - collision.width / 2 - this.width / 2;
                    this.speedX = 0;
                }
                else if (this.x + this.width / 2 > collision.x + collision.width / 2 && lastX - this.width / 2 >= collision.x + collision.width / 2) {
                    this.x = collision.x + collision.width / 2 + this.width / 2;
                    this.speedX = 0;
                }
                break;
            case CollisionType.TriangleBottomRight:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return;
                }
                // if (this.x - this.width / 2 >= collision.x + collision.width / 2) {
                //     return;
                // }
                // if (this.y - this.height / 2 >= collision.y + collision.height / 2) {
                //     return;
                // }
                if (this.y + this.height / 2 - collision.y <= -collision.height / collision.width * (this.x + this.width / 2 - collision.x) + 1e-10) {
                    return;
                }
                this.collided = true;
                if (this.y - this.height / 2 - collision.y < -collision.height / collision.width * (this.x - this.width / 2 - collision.x) && lastY + this.height / 2 - collision.y <= -collision.height / collision.width * (lastX + this.width / 2 - collision.x) + 1e-10) {
                    let cos = collision.width / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
                    let sin = collision.height / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
                    let distance = (this.y + this.height / 2 - collision.y + collision.height / collision.width * (this.x + this.width / 2 - collision.x)) * cos;
                    this.x -= distance * sin;
                    this.y -= distance * cos;
                    let perpendicular = this.speedX * sin + this.speedY * cos;
                    this.speedX -= perpendicular * sin;
                    this.speedY -= perpendicular * cos;
                    // this.onGround = 3;
                }
                else if (this.y - this.height / 2 < collision.y - collision.height / 2 && lastY + this.height / 2 <= collision.y - collision.height / 2) {
                    this.y = collision.y - collision.height / 2 - this.height / 2;
                    this.speedY = 0;
                    // this.onGround = 3;
                }
                else if (this.y + this.height / 2 > collision.y + collision.height / 2 && lastY - this.height / 2 >= collision.y + collision.height / 2) {
                    this.y = collision.y + collision.height / 2 + this.height / 2;
                    this.speedY = 0;
                }
                else if (this.x - this.width / 2 < collision.x - collision.width / 2 && lastX + this.width / 2 <= collision.x - collision.width / 2) {
                    this.x = collision.x - collision.width / 2 - this.width / 2;
                    this.speedX = 0;
                }
                else if (this.x + this.width / 2 > collision.x + collision.width / 2 && lastX - this.width / 2 >= collision.x + collision.width / 2) {
                    this.x = collision.x + collision.width / 2 + this.width / 2;
                    this.speedX = 0;
                }
                break;
            case CollisionType.StairBottomRight:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return;
                }
                // if (this.x - this.width / 2 >= collision.x + collision.width / 2) {
                //     return;
                // }
                // if (this.y - this.height / 2 >= collision.y + collision.height / 2) {
                //     return;
                // }
                if (this.y + this.height / 2 - collision.y <= -collision.height / collision.width * (this.x + this.width / 2 - collision.x) + 1e-10) {
                    return;
                }
                this.collided = true;
                if (this.y - this.height / 2 - collision.y < -collision.height / collision.width * (this.x - this.width / 2 - collision.x) && lastY + this.height / 2 - collision.y <= -collision.height / collision.width * (lastX + this.width / 2 - collision.x) + 1e-10) {
                    let distance = this.y + this.height / 2 - collision.y + collision.height / collision.width * (this.x + this.width / 2 - collision.x);
                    this.y -= distance;
                    this.speedY = 0;
                    // this.onGround = 3;
                }
                else if (this.y - this.height / 2 < collision.y - collision.height / 2 && lastY + this.height / 2 <= collision.y - collision.height / 2) {
                    this.y = collision.y - collision.height / 2 - this.height / 2;
                    this.speedY = 0;
                    // this.onGround = 3;
                }
                else if (this.y + this.height / 2 > collision.y + collision.height / 2 && lastY - this.height / 2 >= collision.y + collision.height / 2) {
                    this.y = collision.y + collision.height / 2 + this.height / 2;
                    this.speedY = 0;
                }
                else if (this.x - this.width / 2 < collision.x - collision.width / 2 && lastX + this.width / 2 <= collision.x - collision.width / 2) {
                    this.x = collision.x - collision.width / 2 - this.width / 2;
                    this.speedX = 0;
                }
                else if (this.x + this.width / 2 > collision.x + collision.width / 2 && lastX - this.width / 2 >= collision.x + collision.width / 2) {
                    this.x = collision.x + collision.width / 2 + this.width / 2;
                    this.speedX = 0;
                }
                break;
        }
        return false;
    }
    isCollidingWithMap(lastX: number, lastY: number) {
        // if (this.x - this.width / 2 < 0 || this.x + this.width / 2 > StaticMap.list.get(clientPlayer.map).width * 8 || this.y - this.height / 2 < 0 || this.y + this.height / 2 > StaticMap.list.get(clientPlayer.map).height * 8) {
        //     return true;
        // }
        for (let y = Math.max(Math.floor((this.y - this.height / 2) / 8), 0); y < Math.min(Math.ceil((this.y + this.height / 2) / 8), StaticMap.list.get(clientPlayer.map).height); y++) {
            for (let x = Math.max(Math.floor((this.x - this.width / 2) / 8), 0); x < Math.min(Math.ceil((this.x + this.width / 2) / 8), StaticMap.list.get(clientPlayer.map).width); x++) {
                // if (pixels[StaticMap.list.get(clientPlayer.map).grid[(x + y * StaticMap.list.get(clientPlayer.map).width) * StaticMap.list.get(clientPlayer.map).stride + Pixel.Id]].state == State.Solid) {
                //     return true;
                // }
                let collisions = StaticMap.list.get(clientPlayer.map).collisions[x + y * StaticMap.list.get(clientPlayer.map).width];
                for (let i = 0; i < collisions.length; i++) {
                    if (this.isCollidingWithCollision(collisions[i], lastX, lastY)) {
                        return true;
                    }
                }
            }
        }
        for (let [_, rig] of Rig.list) {
            if (rig.id == this.id) {
                continue;
            }
            if (rig.collision != null) {
                if (this.isCollidingWithCollision(rig.collision, lastX, lastY)) {
                    return true;
                }
            }
        }
        return false;
    }
    collideWithMap(lastX: number, lastY: number) {
        let lastSpeedX = this.speedX;
        let lastSpeedY = this.speedY;
        // if (this.x - this.width / 2 < 0) {
        //     this.x = this.width / 2;
        //     this.speedX = 0;
        // }
        // if (this.x + this.width / 2 > StaticMap.list.get(clientPlayer.map).width * 8) {
        //     this.x = StaticMap.list.get(clientPlayer.map).width * 8 - this.width / 2;
        //     this.speedX = 0;
        // }
        // if (this.y - this.height / 2 < 0) {
        //     this.y = this.height / 2;
        //     this.speedY = 0;
        // }
        // if (this.y + this.height / 2 > StaticMap.list.get(clientPlayer.map).height * 8) {
        //     this.y = StaticMap.list.get(clientPlayer.map).height * 8 - this.height / 2;
        //     this.speedY = 0;
        // }
        let collisions = [];
        for (let y = Math.max(Math.floor((this.y - this.height / 2) / 8), 0); y < Math.min(Math.ceil((this.y + this.height / 2) / 8), StaticMap.list.get(clientPlayer.map).height); y++) {
            for (let x = Math.max(Math.floor((this.x - this.width / 2) / 8), 0); x < Math.min(Math.ceil((this.x + this.width / 2) / 8), StaticMap.list.get(clientPlayer.map).width); x++) {
                collisions.push(...StaticMap.list.get(clientPlayer.map).collisions[x + y * StaticMap.list.get(clientPlayer.map).width]);
            }
        }
        for (let [_, rig] of Rig.list) {
            if (rig.id == this.id) {
                continue;
            }
            if (rig.collision != null) {
                collisions.push(rig.collision);
            }
        }
        // for (let y = Math.max(Math.floor((this.y - this.height / 2) / 8) - 1, 0); y < Math.min(Math.ceil((this.y + this.height / 2) / 8) + 1, StaticMap.list.get(clientPlayer.map).height - 1); y++) {
        //     for (let x = Math.max(Math.floor((this.x - this.width / 2) / 8) - 1, 0); x < Math.min(Math.ceil((this.x + this.width / 2) / 8) + 1, StaticMap.list.get(clientPlayer.map).width - 1); x++) {
        //         collisions.push(...StaticMap.list.get(clientPlayer.map).collisions[x + y * StaticMap.list.get(clientPlayer.map).width]);
        //     }
        // }
        collisions.sort((a: Collision, b: Collision) => {
            if (a.x == b.x) {
                return lastSpeedY * (a.y - b.y);
            }
            return lastSpeedX * (a.x - b.x);
        });
        for (let i = 0; i < collisions.length; i++) {
            this.collideWithCollision(collisions[i], lastX, lastY);
        }
        // return false;
    }
    // move(frameTime: number) {
    //     this.collided = false;
    //     let timeRemaining = frameTime;
    //     let times = 0;
    //     while (timeRemaining > 0) {
    //         let planeX = Math.max(Math.sign(this.speedX), 0);
    //         let planeY = Math.max(Math.sign(this.speedY), 0);
    //         let inverseSpeedX = 1 / this.speedX;
    //         let inverseSpeedY = 1 / this.speedY;
    //         let frontX = this.x;
    //         let frontY = this.y;
    //         let distanceX = (planeX - (frontX - Math.floor(frontX)));
    //         let distanceY = (planeY - (frontY - Math.floor(frontY)));
    //         if (distanceX == 0) {
    //             distanceX = -1;
    //         }
    //         if (distanceY == 0) {
    //             distanceY = -1;
    //         }
    //         let timeX = distanceX * inverseSpeedX;
    //         let timeY = distanceY * inverseSpeedY;

    //         if (!isFinite(timeX)) {
    //             timeX = Infinity;
    //         }
    //         if (!isFinite(timeY)) {
    //             timeY = Infinity;
    //         }
            
    //         let lastX = this.x;
    //         let lastY = this.y;
            
    //         let time = Math.min(Math.min(timeX, timeY), timeRemaining);

    //         this.x += this.speedX * time;
    //         this.y += this.speedY * time;
    //         timeRemaining -= time;
    //         times += 1;
    //         if (times > 1000) {
    //             console.warn("moved >1000 times!")
    //             break;
    //         }
    //         this.collideWithMap(lastX, lastY);

    //         if (this.isCollidingWithMap(lastX, lastY)) {
    //             this.x = lastX;
    //             this.y = lastY;
    //             this.collided = true;
    //         }

    //         if (this.speedX == 0 && this.speedY == 0) {
    //             break;
    //         }
    //     }
    // }
    // isCollidingWithCollision(collision: Collision, lastX: number, lastY: number) {
    //     switch (collision.type) {
    //         case CollisionType.Rectangle:
    //             if (this.x < collision.x + collision.width / 2 && this.x > collision.x - collision.width / 2 && this.y < collision.y + collision.height / 2 && this.y > collision.y - collision.height / 2) {
    //                 return true;
    //             }
    //             break;
    //         case CollisionType.TriangleTopLeft:
    //         case CollisionType.StairTopLeft:
    //             if (this.x <= collision.x - collision.width / 2) {
    //                 return false;
    //             }
    //             if (this.y <= collision.y - collision.height / 2) {
    //                 return false;
    //             }
    //             if (this.y - collision.y >= -collision.height / collision.width * (this.x - collision.x) - 1e-10) {
    //                 return false;
    //             }
    //             return true;
    //         case CollisionType.TriangleTopRight:
    //         case CollisionType.StairTopRight:
    //             if (this.x >= collision.x + collision.width / 2) {
    //                 return false;
    //             }
    //             if (this.y <= collision.y - collision.height / 2) {
    //                 return false;
    //             }
    //             if (this.y - collision.y >= collision.height / collision.width * (this.x - collision.x) - 1e-10) {
    //                 return false;
    //             }
    //             return true;
    //         case CollisionType.TriangleBottomLeft:
    //         case CollisionType.StairBottomLeft:
    //             if (this.x <= collision.x - collision.width / 2) {
    //                 return false;
    //             }
    //             if (this.y >= collision.y + collision.height / 2) {
    //                 return false;
    //             }
    //             if (this.y - collision.y <= collision.height / collision.width * (this.x - collision.x) + 1e-10) {
    //                 return false;
    //             }
    //             return true;
    //         case CollisionType.TriangleBottomRight:
    //         case CollisionType.StairBottomRight:
    //             if (this.x >= collision.x + collision.width / 2) {
    //                 return false;
    //             }
    //             if (this.y >= collision.y + collision.height / 2) {
    //                 return false;
    //             }
    //             if (this.y - collision.y <= -collision.height / collision.width * (this.x - collision.x) + 1e-10) {
    //                 return false;
    //             }
    //             return true;
    //     }
    //     return false;
    // }
    // isCollidingWithMap(lastX: number, lastY: number) {
    //     if (this.x < 0 || this.x > StaticMap.list.get(clientPlayer.map).width * 8 || this.y < 0 || this.y > StaticMap.list.get(clientPlayer.map).height * 8) {
    //         return true;
    //     }
    //     for (let y = Math.floor((this.y) / 8); y < Math.ceil((this.y) / 8); y++) {
    //         for (let x = Math.floor((this.x) / 8); x < Math.ceil((this.x) / 8); x++) {
    //             let collisions = StaticMap.list.get(clientPlayer.map).collisions[x + y * StaticMap.list.get(clientPlayer.map).width];
    //             for (let i = 0; i < collisions.length; i++) {
    //                 if (this.isCollidingWithCollision(collisions[i], lastX, lastY)) {
    //                     return true;
    //                 }
    //             }
    //         }
    //     }
    //     for (let [_, rig] of Rig.list) {
    //         if (rig.id == this.id) {
    //             continue;
    //         }
    //         if (rig.collision != null) {
    //             if (this.isCollidingWithCollision(rig.collision, lastX, lastY)) {
    //                 return true;
    //             }
    //         }
    //     }
    //     return false;
    // }
    // collideWithMap(lastX: number, lastY: number) {
    //     let lastSpeedX = this.speedX;
    //     let lastSpeedY = this.speedY;
    //     if (this.x < 0) {
    //         this.x = 0;
    //         this.speedX = 0;
    //     }
    //     if (this.x > StaticMap.list.get(clientPlayer.map).width * 8) {
    //         this.x = StaticMap.list.get(clientPlayer.map).width * 8;
    //         this.speedX = 0;
    //     }
    //     if (this.y < 0) {
    //         this.y = 0;
    //         this.speedY = 0;
    //     }
    //     if (this.y > StaticMap.list.get(clientPlayer.map).height * 8) {
    //         this.y = StaticMap.list.get(clientPlayer.map).height * 8;
    //         this.speedY = 0;
    //     }
    //     let collisions = [];
    //     for (let y = Math.floor((this.y) / 8); y < Math.ceil((this.y) / 8); y++) {
    //         for (let x = Math.floor((this.x) / 8); x < Math.ceil((this.x) / 8); x++) {
    //             collisions.push(...StaticMap.list.get(clientPlayer.map).collisions[x + y * StaticMap.list.get(clientPlayer.map).width]);
    //         }
    //     }
    //     for (let [_, rig] of Rig.list) {
    //         if (rig.id == this.id) {
    //             continue;
    //         }
    //         if (rig.collision != null) {
    //             collisions.push(rig.collision);
    //         }
    //     }
    //     // for (let y = Math.max(Math.floor((this.y) / 8) - 1, 0); y < Math.min(Math.ceil((this.y) / 8) + 1, StaticMap.list.get(clientPlayer.map).height - 1); y++) {
    //     //     for (let x = Math.max(Math.floor((this.x) / 8) - 1, 0); x < Math.min(Math.ceil((this.x) / 8) + 1, StaticMap.list.get(clientPlayer.map).width - 1); x++) {
    //     //         collisions.push(...StaticMap.list.get(clientPlayer.map).collisions[x + y * StaticMap.list.get(clientPlayer.map).width]);
    //     //     }
    //     // }
    //     collisions.sort((a: Collision, b: Collision) => {
    //         if (a.x == b.x) {
    //             return lastSpeedY * (a.y - b.y);
    //         }
    //         return lastSpeedX * (a.x - b.x);
    //     });
    //     for (let i = 0; i < collisions.length; i++) {
    //         this.collideWithCollision(collisions[i], lastX, lastY);
    //     }
    //     // return false;
    // }
    // collideWithCollision(collision: Collision, lastX: number, lastY: number) {
    //     switch (collision.type) {
    //         case CollisionType.Rectangle:
    //             // if (this.x > collision.x + collision.width / 2 || this.x < collision.x - collision.width / 2 || this.y > collision.y + collision.height / 2 || this.y < collision.y - collision.height / 2) {
    //             //     return;
    //             // }
    //             if (lastY <= collision.y - collision.height / 2) {
    //                 this.y = collision.y - collision.height / 2;
    //                 this.speedY = 0;
    //                 // this.onGround = 3;
    //                 this.collided = true;
    //             }
    //             else if (lastY >= collision.y + collision.height / 2) {
    //                 this.y = collision.y + collision.height / 2;
    //                 this.speedY = 0;
    //                 this.collided = true;
    //             }
    //             else if (lastX <= collision.x - collision.width / 2) {
    //                 this.x = collision.x - collision.width / 2;
    //                 this.speedX = 0;
    //                 this.collided = true;
    //             }
    //             else if (lastX >= collision.x + collision.width / 2) {
    //                 this.x = collision.x + collision.width / 2;
    //                 this.speedX = 0;
    //                 this.collided = true;
    //             }
    //             break;
    //         case CollisionType.TriangleTopLeft:
    //             if (this.x <= collision.x - collision.width / 2) {
    //                 return;
    //             }
    //             if (this.y <= collision.y - collision.height / 2) {
    //                 return;
    //             }
    //             if (this.y - collision.y >= -collision.height / collision.width * (this.x - collision.x) - 1e-10) {
    //                 return;
    //             }
    //             if (this.y - collision.y > -collision.height / collision.width * (this.x - collision.x) && lastY - collision.y >= -collision.height / collision.width * (lastX - collision.x) - 1e-10) {
    //                 let cos = collision.width / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
    //                 let sin = collision.height / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
    //                 let distance = (this.y - collision.y + collision.height / collision.width * (this.x - collision.x)) * cos;
    //                 this.x -= distance * sin;
    //                 this.y -= distance * cos;
    //                 let perpendicular = -this.speedX * sin + -this.speedY * cos;
    //                 this.speedX += perpendicular * sin;
    //                 this.speedY += perpendicular * cos;
    //             }
    //             else if (this.y < collision.y - collision.height / 2 && lastY <= collision.y - collision.height / 2) {
    //                 this.y = collision.y - collision.height / 2;
    //                 this.speedY = 0;
    //                 // this.onGround = 3;
    //             }
    //             else if (this.y > collision.y + collision.height / 2 && lastY >= collision.y + collision.height / 2) {
    //                 this.y = collision.y + collision.height / 2;
    //                 this.speedY = 0;
    //             }
    //             else if (this.x < collision.x - collision.width / 2 && lastX <= collision.x - collision.width / 2) {
    //                 this.x = collision.x - collision.width / 2;
    //                 this.speedX = 0;
    //             }
    //             else if (this.x > collision.x + collision.width / 2 && lastX >= collision.x + collision.width / 2) {
    //                 this.x = collision.x + collision.width / 2;
    //                 this.speedX = 0;
    //             }
    //             break;
    //         case CollisionType.StairTopLeft:
    //             if (this.x <= collision.x - collision.width / 2) {
    //                 return;
    //             }
    //             if (this.y <= collision.y - collision.height / 2) {
    //                 return;
    //             }
    //             if (this.y - collision.y >= -collision.height / collision.width * (this.x - collision.x) - 1e-10) {
    //                 return;
    //             }
    //             if (this.y - collision.y > -collision.height / collision.width * (this.x - collision.x) && lastY - collision.y >= -collision.height / collision.width * (lastX - collision.x) - 1e-10) {
    //                 let distance = this.y - collision.y + collision.height / collision.width * (this.x - collision.x);
    //                 this.y -= distance;
    //                 this.speedY = 0;
    //             }
    //             else if (this.y < collision.y - collision.height / 2 && lastY <= collision.y - collision.height / 2) {
    //                 this.y = collision.y - collision.height / 2;
    //                 this.speedY = 0;
    //                 // this.onGround = 3;
    //             }
    //             else if (this.y > collision.y + collision.height / 2 && lastY >= collision.y + collision.height / 2) {
    //                 this.y = collision.y + collision.height / 2;
    //                 this.speedY = 0;
    //             }
    //             else if (this.x < collision.x - collision.width / 2 && lastX <= collision.x - collision.width / 2) {
    //                 this.x = collision.x - collision.width / 2;
    //                 this.speedX = 0;
    //             }
    //             else if (this.x > collision.x + collision.width / 2 && lastX >= collision.x + collision.width / 2) {
    //                 this.x = collision.x + collision.width / 2;
    //                 this.speedX = 0;
    //             }
    //             break;
    //         case CollisionType.TriangleTopRight:
    //             if (this.x >= collision.x + collision.width / 2) {
    //                 return;
    //             }
    //             if (this.y <= collision.y - collision.height / 2) {
    //                 return;
    //             }
    //             if (this.y - collision.y >= collision.height / collision.width * (this.x - collision.x) - 1e-10) {
    //                 return;
    //             }
    //             if (this.y - collision.y > collision.height / collision.width * (this.x - collision.x) && lastY - collision.y >= collision.height / collision.width * (lastX - collision.x) - 1e-10) {
    //                 let cos = collision.width / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
    //                 let sin = collision.height / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
    //                 let distance = (this.y - collision.y - collision.height / collision.width * (this.x - collision.x)) * cos;
    //                 this.x += distance * sin;
    //                 this.y -= distance * cos;
    //                 let perpendicular = this.speedX * sin + -this.speedY * cos;
    //                 this.speedX -= perpendicular * sin;
    //                 this.speedY += perpendicular * cos;
    //             }
    //             else if (this.y < collision.y - collision.height / 2 && lastY <= collision.y - collision.height / 2) {
    //                 this.y = collision.y - collision.height / 2;
    //                 this.speedY = 0;
    //                 // this.onGround = 3;
    //             }
    //             else if (this.y > collision.y + collision.height / 2 && lastY >= collision.y + collision.height / 2) {
    //                 this.y = collision.y + collision.height / 2;
    //                 this.speedY = 0;
    //             }
    //             else if (this.x < collision.x - collision.width / 2 && lastX <= collision.x - collision.width / 2) {
    //                 this.x = collision.x - collision.width / 2;
    //                 this.speedX = 0;
    //             }
    //             else if (this.x > collision.x + collision.width / 2 && lastX >= collision.x + collision.width / 2) {
    //                 this.x = collision.x + collision.width / 2;
    //                 this.speedX = 0;
    //             }
    //             break;
    //         case CollisionType.StairTopRight:
    //             if (this.x >= collision.x + collision.width / 2) {
    //                 return;
    //             }
    //             if (this.y <= collision.y - collision.height / 2) {
    //                 return;
    //             }
    //             if (this.y - collision.y >= collision.height / collision.width * (this.x - collision.x) - 1e-10) {
    //                 return;
    //             }
    //             if (this.y - collision.y > collision.height / collision.width * (this.x - collision.x) && lastY - collision.y >= collision.height / collision.width * (lastX - collision.x) - 1e-10) {
    //                 let distance = this.y - collision.y - collision.height / collision.width * (this.x - collision.x);
    //                 this.y -= distance;
    //                 this.speedY = 0;
    //             }
    //             else if (this.y < collision.y - collision.height / 2 && lastY <= collision.y - collision.height / 2) {
    //                 this.y = collision.y - collision.height / 2;
    //                 this.speedY = 0;
    //                 // this.onGround = 3;
    //             }
    //             else if (this.y > collision.y + collision.height / 2 && lastY >= collision.y + collision.height / 2) {
    //                 this.y = collision.y + collision.height / 2;
    //                 this.speedY = 0;
    //             }
    //             else if (this.x < collision.x - collision.width / 2 && lastX <= collision.x - collision.width / 2) {
    //                 this.x = collision.x - collision.width / 2;
    //                 this.speedX = 0;
    //             }
    //             else if (this.x > collision.x + collision.width / 2 && lastX >= collision.x + collision.width / 2) {
    //                 this.x = collision.x + collision.width / 2;
    //                 this.speedX = 0;
    //             }
    //             break;
    //         case CollisionType.TriangleBottomLeft:
    //             if (this.x <= collision.x - collision.width / 2) {
    //                 return;
    //             }
    //             if (this.y >= collision.y + collision.height / 2) {
    //                 return;
    //             }
    //             if (this.y - collision.y <= collision.height / collision.width * (this.x - collision.x) + 1e-10) {
    //                 return;
    //             }
    //             if (this.y - collision.y < collision.height / collision.width * (this.x - collision.x) && lastY - collision.y <= collision.height / collision.width * (lastX - collision.x) + 1e-10) {
    //                 let cos = collision.width / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
    //                 let sin = collision.height / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
    //                 let distance = (this.y - collision.y - collision.height / collision.width * (this.x - collision.x)) * cos;
    //                 this.x += distance * sin;
    //                 this.y -= distance * cos;
    //                 let perpendicular = -this.speedX * sin + this.speedY * cos;
    //                 this.speedX += perpendicular * sin;
    //                 this.speedY -= perpendicular * cos;
    //                 // this.onGround = 3;
    //             }
    //             else if (this.y < collision.y - collision.height / 2 && lastY <= collision.y - collision.height / 2) {
    //                 this.y = collision.y - collision.height / 2;
    //                 this.speedY = 0;
    //                 // this.onGround = 3;
    //             }
    //             else if (this.y > collision.y + collision.height / 2 && lastY >= collision.y + collision.height / 2) {
    //                 this.y = collision.y + collision.height / 2;
    //                 this.speedY = 0;
    //             }
    //             else if (this.x < collision.x - collision.width / 2 && lastX <= collision.x - collision.width / 2) {
    //                 this.x = collision.x - collision.width / 2;
    //                 this.speedX = 0;
    //             }
    //             else if (this.x > collision.x + collision.width / 2 && lastX >= collision.x + collision.width / 2) {
    //                 this.x = collision.x + collision.width / 2;
    //                 this.speedX = 0;
    //             }
    //             break;
    //         case CollisionType.StairBottomLeft:
    //             if (this.x <= collision.x - collision.width / 2) {
    //                 return;
    //             }
    //             if (this.y >= collision.y + collision.height / 2) {
    //                 return;
    //             }
    //             if (this.y - collision.y <= collision.height / collision.width * (this.x - collision.x) + 1e-10) {
    //                 return;
    //             }
    //             if (this.y - collision.y < collision.height / collision.width * (this.x - collision.x) && lastY - collision.y <= collision.height / collision.width * (lastX - collision.x) + 1e-10) {
    //                 let distance = this.y - collision.y - collision.height / collision.width * (this.x - collision.x);
    //                 this.y -= distance;
    //                 this.speedY = 0;
    //                 // this.onGround = 3;
    //             }
    //             else if (this.y < collision.y - collision.height / 2 && lastY <= collision.y - collision.height / 2) {
    //                 this.y = collision.y - collision.height / 2;
    //                 this.speedY = 0;
    //                 // this.onGround = 3;
    //             }
    //             else if (this.y > collision.y + collision.height / 2 && lastY >= collision.y + collision.height / 2) {
    //                 this.y = collision.y + collision.height / 2;
    //                 this.speedY = 0;
    //             }
    //             else if (this.x < collision.x - collision.width / 2 && lastX <= collision.x - collision.width / 2) {
    //                 this.x = collision.x - collision.width / 2;
    //                 this.speedX = 0;
    //             }
    //             else if (this.x > collision.x + collision.width / 2 && lastX >= collision.x + collision.width / 2) {
    //                 this.x = collision.x + collision.width / 2;
    //                 this.speedX = 0;
    //             }
    //             break;
    //         case CollisionType.TriangleBottomRight:
    //             if (this.x >= collision.x + collision.width / 2) {
    //                 return;
    //             }
    //             if (this.y >= collision.y + collision.height / 2) {
    //                 return;
    //             }
    //             if (this.y - collision.y <= -collision.height / collision.width * (this.x - collision.x) + 1e-10) {
    //                 return;
    //             }
    //             if (this.y - collision.y < -collision.height / collision.width * (this.x - collision.x) && lastY - collision.y <= -collision.height / collision.width * (lastX - collision.x) + 1e-10) {
    //                 let cos = collision.width / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
    //                 let sin = collision.height / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
    //                 let distance = (this.y - collision.y + collision.height / collision.width * (this.x - collision.x)) * cos;
    //                 this.x -= distance * sin;
    //                 this.y -= distance * cos;
    //                 let perpendicular = this.speedX * sin + this.speedY * cos;
    //                 this.speedX -= perpendicular * sin;
    //                 this.speedY -= perpendicular * cos;
    //                 // this.onGround = 3;
    //             }
    //             else if (this.y < collision.y - collision.height / 2 && lastY <= collision.y - collision.height / 2) {
    //                 this.y = collision.y - collision.height / 2;
    //                 this.speedY = 0;
    //                 // this.onGround = 3;
    //             }
    //             else if (this.y > collision.y + collision.height / 2 && lastY >= collision.y + collision.height / 2) {
    //                 this.y = collision.y + collision.height / 2;
    //                 this.speedY = 0;
    //             }
    //             else if (this.x < collision.x - collision.width / 2 && lastX <= collision.x - collision.width / 2) {
    //                 this.x = collision.x - collision.width / 2;
    //                 this.speedX = 0;
    //             }
    //             else if (this.x > collision.x + collision.width / 2 && lastX >= collision.x + collision.width / 2) {
    //                 this.x = collision.x + collision.width / 2;
    //                 this.speedX = 0;
    //             }
    //             break;
    //         case CollisionType.StairBottomRight:
    //             if (this.x >= collision.x + collision.width / 2) {
    //                 return;
    //             }
    //             if (this.y >= collision.y + collision.height / 2) {
    //                 return;
    //             }
    //             if (this.y - collision.y <= -collision.height / collision.width * (this.x - collision.x) + 1e-10) {
    //                 return;
    //             }
    //             if (this.y - collision.y < -collision.height / collision.width * (this.x - collision.x) && lastY - collision.y <= -collision.height / collision.width * (lastX - collision.x) + 1e-10) {
    //                 let distance = this.y - collision.y + collision.height / collision.width * (this.x - collision.x);
    //                 this.y -= distance;
    //                 this.speedY = 0;
    //                 // this.onGround = 3;
    //             }
    //             else if (this.y < collision.y - collision.height / 2 && lastY <= collision.y - collision.height / 2) {
    //                 this.y = collision.y - collision.height / 2;
    //                 this.speedY = 0;
    //                 // this.onGround = 3;
    //             }
    //             else if (this.y > collision.y + collision.height / 2 && lastY >= collision.y + collision.height / 2) {
    //                 this.y = collision.y + collision.height / 2;
    //                 this.speedY = 0;
    //             }
    //             else if (this.x < collision.x - collision.width / 2 && lastX <= collision.x - collision.width / 2) {
    //                 this.x = collision.x - collision.width / 2;
    //                 this.speedX = 0;
    //             }
    //             else if (this.x > collision.x + collision.width / 2 && lastX >= collision.x + collision.width / 2) {
    //                 this.x = collision.x + collision.width / 2;
    //                 this.speedX = 0;
    //             }
    //             break;
    //     }
    //     return false;
    // }
}

class DamageParticle extends GravityParticle {
    value: number;

    constructor(x: number, y: number, value: number) {
        super(x, y, Math.PI * 2, Math.random() * 2 - 1, -3, (Math.random() * 2 - 1) * 0.02, 0.05, 0.1, 0.05, 0, 60);

        let angle = Math.random() * Math.PI * 2;
        let magnitude = Math.random() * 5;

        // this.speedX = magnitude * Math.cos(angle);
        // this.speedY = magnitude * Math.sin(angle) - 5;

        this.value = value;
    }
    draw(belowCtx: OffscreenCanvasRenderingContext2D, aboveCtx: OffscreenCanvasRenderingContext2D) {
        aboveCtx.fillStyle = "#ff0000";
        aboveCtx.strokeStyle = "#000000";
        aboveCtx.lineWidth = 1;
        aboveCtx.lineJoin = "round";
        aboveCtx.lineCap = "round";
        aboveCtx.font = "8px Google Sans Normal";
        aboveCtx.textAlign = "center";
        aboveCtx.textBaseline = "middle";
        aboveCtx.globalAlpha = this.timer / 30;
        aboveCtx.save();
        aboveCtx.translate(this.x, this.y);
        aboveCtx.rotate(this.rotation);
        aboveCtx.scale(2 - this.timer / 60, 2 - this.timer / 60);
        aboveCtx.strokeText(Math.ceil(this.value).toString(), 0, 0);
        aboveCtx.fillText(Math.ceil(this.value).toString(), 0, 0);
        aboveCtx.restore();
        aboveCtx.globalAlpha = 1;
    }
}
class CritDamageParticle extends GravityParticle {
    value: number;

    constructor(x: number, y: number, value: number) {
        super(x, y, Math.PI * 2, (Math.random() * 2 - 1) * 1.5, -3 * 1.5, (Math.random() * 2 - 1) * 0.02, 0.05, 0.1, 0.05, 0, 120);

        let angle = Math.random() * Math.PI * 2;
        let magnitude = Math.random() * 5;

        // this.speedX = magnitude * Math.cos(angle);
        // this.speedY = magnitude * Math.sin(angle) - 5;

        this.value = value;
    }
    draw(belowCtx: OffscreenCanvasRenderingContext2D, aboveCtx: OffscreenCanvasRenderingContext2D) {
        aboveCtx.fillStyle = "#ffff00";
        aboveCtx.strokeStyle = "#000000";
        aboveCtx.lineWidth = 1;
        aboveCtx.lineJoin = "round";
        aboveCtx.lineCap = "round";
        aboveCtx.font = "12px Google Sans Normal";
        aboveCtx.textAlign = "center";
        aboveCtx.textBaseline = "middle";
        aboveCtx.globalAlpha = this.timer / 60;
        aboveCtx.save();
        aboveCtx.translate(this.x, this.y);
        aboveCtx.rotate(this.rotation);
        aboveCtx.scale(2 - this.timer / 60, 2 - this.timer / 60);
        aboveCtx.strokeText(Math.ceil(this.value).toString(), 0, 0);
        aboveCtx.fillText(Math.ceil(this.value).toString(), 0, 0);
        aboveCtx.restore();
        aboveCtx.globalAlpha = 1;
    }
}
class ExplosionParticle extends GravityParticle {
    width: number;
    height: number;

    color: string;

    constructor(x: number, y: number, speedX: number, speedY: number, radius: number) {
        let angle = Math.random() * Math.PI * 2;
        let magnitude = Math.random() * radius / 24;

        super(x + magnitude * Math.cos(angle) * 6, y + magnitude * Math.sin(angle) * 6, Math.random() * Math.PI * 2, speedX + magnitude * Math.cos(angle), speedY + magnitude * Math.sin(angle), (Math.random() * 2 - 1) * 10 * Math.PI / 180, 0.05, 0.05, 0.05, 0, 0);

        let size = Math.random() * 4 + 4;
        this.width = size;
        this.height = size;

        let random = Math.random();
        if (random < 0.4) {
            this.color = "#df3e23";
            this.gravity = 0.05;
            this.totalTime = 90 + Math.random() * 60;
        }
        else if (random < 0.6) {
            this.color = "#b3b9d1";
            this.gravity = 0.05;
            this.totalTime = 90 + Math.random() * 60;
        }
        else if (random < 0.8) {
            this.color = "#6d758d";
            this.gravity = -0.01;
            this.speedY = -0.2 - Math.random() * 0.1;
            this.totalTime = 150 + Math.random() * 60;
        }
        else {
            this.color = "#333941";
            this.gravity = -0.01;
            this.speedY = -0.2 - Math.random() * 0.1;
            this.totalTime = 150 + Math.random() * 60;
        }
        this.timer = this.totalTime;
    }
    draw(belowCtx: OffscreenCanvasRenderingContext2D, aboveCtx: OffscreenCanvasRenderingContext2D) {
        aboveCtx.fillStyle = this.color;
        // aboveCtx.globalAlpha = this.timer / 240;
        // aboveCtx.save();
        // aboveCtx.translate(this.x, this.y);
        // // aboveCtx.rotate(this.rotation);
        // aboveCtx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        // aboveCtx.restore();
        // aboveCtx.globalAlpha = 1;
        let scale = this.timer / this.totalTime;
        aboveCtx.globalAlpha = scale;
        aboveCtx.save();
        aboveCtx.translate(this.x, this.y);
        // aboveCtx.rotate(this.rotation);
        aboveCtx.fillRect(-this.width / 2 * scale, -this.height / 2 * scale, this.width * scale, this.height * scale);
        aboveCtx.restore();
        aboveCtx.globalAlpha = 1;
    }
}
class FireworkParticle extends GravityParticle {
    size: number;

    color: string;

    trails: {
        x: number,
        y: number,
    }[] = [];

    constructor(x: number, y: number, speedX: number, speedY: number, radius: number, color: number) {
        let angle = (Math.floor(Math.random() * 10) / 10 + (Math.random() * 2 - 1) / 60) * Math.PI * 2;
        // let magnitude = (Math.floor(Math.random() * 4) / 4 + (Math.random() * 2 - 1) / 60) * radius / 24;
        // let angle = Math.random() * Math.PI * 2;
        let magnitude = Math.random() * radius / 24;

        super(x + magnitude * Math.cos(angle) * 6, y + magnitude * Math.sin(angle) * 6, Math.random() * Math.PI * 2, speedX + magnitude * Math.cos(angle), speedY + magnitude * Math.sin(angle), (Math.random() * 2 - 1) * 10 * Math.PI / 180, 0.05, 0.05, 0.05, 0, 90 + Math.random() * 60);

        this.size = Math.random() * 2 + 2;

        this.color = "hsl(" + (color * 360 + Math.random() * 15 + 360) % 360 + ", 100%, 50%)";
        this.trails.push({
            x: this.x,
            y: this.y,
        });
    }
    update(frameTime: number) {
        this.timer -= frameTime;
        if (this.timer <= 0) {
            this.trails.pop();
            if (this.trails.length == 0) {
                this.remove();
            }
            return;
        }
        this.speedX *= Math.pow(1 - this.decayX, frameTime);
        this.speedY *= Math.pow(1 - this.decayY, frameTime);
        this.speedY += this.gravity * frameTime;
        this.speedRotation *= Math.pow(1 - this.decayRotation, frameTime);
        this.x += this.speedX * frameTime;
        this.y += this.speedY * frameTime;
        this.rotation += this.speedRotation * frameTime;
        this.trails.splice(0, 0, {
            x: this.x,
            y: this.y,
        });
        if (this.trails.length > 10) {
            this.trails.pop();
        }
    }
    draw(belowCtx: OffscreenCanvasRenderingContext2D, aboveCtx: OffscreenCanvasRenderingContext2D) {
        // aboveCtx.fillStyle = this.color;
        // for (let i = 0; i < this.trails.length; i++) {
        //     aboveCtx.globalAlpha = this.timer / 120;
        //     aboveCtx.globalAlpha = (1 - i / 10) / 2;
        //     aboveCtx.save();
        //     aboveCtx.translate(this.trails[i].x, this.trails[i].y);
        //     // aboveCtx.rotate(this.rotation);
        //     aboveCtx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        //     aboveCtx.restore();
        // }
        // aboveCtx.globalAlpha = 1;
        aboveCtx.fillStyle = this.color;
        let scale = this.timer / this.totalTime;
        aboveCtx.globalAlpha = scale;
        aboveCtx.save();
        aboveCtx.translate(this.x, this.y);
        // aboveCtx.rotate(this.rotation);
        aboveCtx.fillRect(-this.size / 2 * scale, -this.size / 2 * scale, this.size * scale, this.size * scale);
        aboveCtx.restore();
        aboveCtx.globalAlpha = 1;
    }
}

class SnowParticle extends CollisionGravityParticle {
    size: number;

    constructor(x: number, y: number) {
        super(x, y, 1e-10, 1e-10, Math.random() * Math.PI * 2, currentWeather.windSpeedX, currentWeather.windSpeedY, (Math.random() * 2 - 1) * 10 * Math.PI / 180, 0, 0, 0.05, 0, 1000);

        this.size = Math.random() * 2 + 2;

        if (this.isCollidingWithMap(this.x, this.y)) {
            this.remove();
            return;
        }

        // if (this.x == 0) {
        //     this.x -= 4 * Math.sqrt(2);
        // }
        // if (this.x == StaticMap.list.get(clientPlayer.map).width * 8) {
        //     this.x += 4 * Math.sqrt(2);
        // }
        if (this.y == 0) {
            this.y -= 4 * Math.sqrt(2);
        }
    }
    update(frameTime: number) {
        this.speedX += (currentWeather.windSpeedX - this.speedX) * 0.1;
        this.speedY += (currentWeather.windSpeedY - this.speedY) * 0.1;
        super.update(frameTime);

        let buffer = 4 * Math.sqrt(2);
        if (this.x < -buffer / 2 || this.x > StaticMap.list.get(clientPlayer.map).width * 8 + buffer / 2 || this.y > StaticMap.list.get(clientPlayer.map).height * 8 + buffer / 2) {
        // if (this.x <= 0 || this.x >= StaticMap.list.get(clientPlayer.map).width * 8 || this.y >= StaticMap.list.get(clientPlayer.map).height * 8) {
            this.remove();
            return;
        }

        if (this.collided) {
            this.timer = Math.min(this.timer, 60);
            this.speedX *= 0.5;
            this.speedY *= 0.5;
        }
    }
    draw(belowCtx: OffscreenCanvasRenderingContext2D, aboveCtx: OffscreenCanvasRenderingContext2D) {
        let diagonal = this.size * Math.sqrt(2);
        if (this.x + diagonal / 2 < -cameraX || this.x - diagonal / 2 > -cameraX + belowCtx.canvas.width / cameraScale || this.y + diagonal / 2 < -cameraY || this.y - diagonal / 2 > -cameraY + belowCtx.canvas.height / cameraScale) {
            return;
        }
        aboveCtx.fillStyle = "#ffffff99";
        let scale = Math.min(this.timer / 60, 1);
        aboveCtx.globalAlpha = scale;
        aboveCtx.save();
        aboveCtx.translate(this.x, this.y);
        aboveCtx.rotate(this.rotation);
        aboveCtx.fillRect(-this.size / 2 * scale, -this.size / 2 * scale, this.size * scale, this.size * scale);
        aboveCtx.restore();
        aboveCtx.globalAlpha = 1;
    }
}

export { Particle, DamageParticle, CritDamageParticle, ExplosionParticle, FireworkParticle, SnowParticle };