import { cameraScale } from "../game/camera.js";

enum EntityType {
    Entity,
    Player,
    Projectile,
}

class Entity {
    id: number;
    x: number;
    y: number;
    speedX = 0;
    speedY = 0;
    width: number;
    height: number;

    phantomFrames: number;

    interpolationFrames = 0;

    updated = true;

    static list = new Map<number, Entity>();

    constructor(id: number, x: number, y: number, width: number, height: number, phantomFrames: number) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.phantomFrames = phantomFrames;

        Entity.list.set(this.id, this);
    }

    update() {
        if (this.interpolationFrames > 0) {
            this.interpolationFrames -= 1;
            this.x += this.speedX;
            this.y += this.speedY;
        }
    }
    draw(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = "red";
        ctx.lineWidth = 1 / cameraScale;
        if ("rotation" in this) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation as number);
            ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.restore();
        }
        else {
            ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        }
    }

    static updateAll() {
        for (let [_, entity] of Entity.list) {
            entity.update();
        }
    }
    static drawAll(ctx: CanvasRenderingContext2D) {
        for (let [_, entity] of Entity.list) {
            if (entity.phantomFrames == 1) {
                entity.draw(ctx);
            }
            else {
                entity.x -= entity.speedX;
                entity.y -= entity.speedY;
                for (let j = 0; j < entity.phantomFrames; j++) {
                    entity.x += entity.speedX / entity.phantomFrames;
                    entity.y += entity.speedY / entity.phantomFrames;
                    ctx.globalAlpha = (j + 1) / entity.phantomFrames;
                    entity.draw(ctx);
                }
                ctx.globalAlpha = 1;
            }
        }
    }
}

export { Entity, EntityType };