class Particle {
    id = Math.random();
    x: number;
    y: number;

    static list = new Map<number, Particle>();

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;

        Particle.list.set(this.id, this);
    }

    update() {
    }
    draw(ctx: CanvasRenderingContext2D) {
    }
    remove() {
        Particle.list.delete(this.id);
    }

    static updateAll() {
        for (let [_, particle] of Particle.list) {
            particle.update();
        }
    }
    static drawAll(ctx: CanvasRenderingContext2D) {
        for (let [_, particle] of Particle.list) {
            particle.draw(ctx);
        }
    }
}

class DamageParticle extends Particle {
    speedX: number;
    speedY: number;

    value: number;
    timer: number;

    constructor(x: number, y: number, value: number) {
        super(x, y);

        let angle = Math.random() * Math.PI * 2;
        let magnitude = Math.random() * 5;

        // this.speedX = magnitude * Math.cos(angle);
        // this.speedY = magnitude * Math.sin(angle) - 5;
        this.speedX = (Math.random() * 2 - 1);
        this.speedY = -1;

        this.value = value;
        this.timer = 60;
    }
    update() {
        if (this.timer <= 0) {
            this.remove();
        }
        this.timer -= 1;
        this.speedX *= 0.95;
        this.speedY += 0.05;
        this.x += this.speedX;
        this.y += this.speedY;
    }
    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = "#ff0000";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.font = "8px Miniset";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = this.timer / 30;
        // ctx.strokeText(Math.ceil(this.value).toString(), this.x, this.y);
        ctx.fillText(Math.ceil(this.value).toString(), this.x, this.y);
        ctx.globalAlpha = 1;
    }
}
class CritDamageParticle extends Particle {
    speedX: number;
    speedY: number;

    value: number;
    timer: number;

    constructor(x: number, y: number, value: number) {
        super(x, y);

        let angle = Math.random() * Math.PI * 2;
        let magnitude = Math.random() * 5;

        // this.speedX = magnitude * Math.cos(angle);
        // this.speedY = magnitude * Math.sin(angle) - 5;
        this.speedX = (Math.random() * 2 - 1) * 1.5;
        this.speedY = -1.5;

        this.value = value;
        this.timer = 120;
    }
    update() {
        if (this.timer <= 0) {
            this.remove();
        }
        this.timer -= 1;
        this.speedX *= 0.95;
        this.speedY += 0.05;
        this.x += this.speedX;
        this.y += this.speedY;
    }
    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = "#ffff00";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.font = "12px Miniset";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = this.timer / 60;
        // ctx.strokeText(Math.ceil(this.value).toString(), this.x, this.y);
        ctx.fillText(Math.ceil(this.value).toString(), this.x, this.y);
        ctx.globalAlpha = 1;
    }
}
class ExplosionParticle extends Particle {
    rotation: number;

    speedX: number;
    speedY: number;
    speedRotation: number;

    gravity: number;

    width: number;
    height: number;

    color: string;
    timer: number;

    constructor(x: number, y: number, speedX: number, speedY: number, radius: number) {
        super(x, y);

        let angle = Math.random() * Math.PI * 2;
        let magnitude = Math.random() * radius / 24;

        this.x += magnitude * Math.cos(angle) * 6;
        this.y += magnitude * Math.sin(angle) * 6;

        this.rotation = Math.random() * Math.PI * 2;

        this.speedX = speedX + magnitude * Math.cos(angle);
        this.speedY = speedY + magnitude * Math.sin(angle);

        this.speedRotation = (Math.random() * 2 - 1) * 10 * Math.PI / 180;

        let size = Math.random() * 4 + 4;
        this.width = size;
        this.height = size;

        this.timer = 120;

        let random = Math.random();
        if (random < 0.4) {
            this.color = "#df3e23";
            this.gravity = 0.05;
        }
        else if (random < 0.6) {
            this.color = "#b3b9d1";
            this.gravity = 0.05;
        }
        else if (random < 0.8) {
            this.color = "#6d758d";
            this.gravity = -0.01;
            this.speedY = -0.2 - Math.random() * 0.1;
        }
        else {
            this.color = "#333941";
            this.gravity = -0.01;
            this.speedY = -0.2 - Math.random() * 0.1;
        }
    }
    update() {
        if (this.timer <= 0) {
            this.remove();
        }
        this.timer -= 1;
        this.speedX *= 0.95;
        this.speedY *= 0.95;
        this.speedY += this.gravity;
        this.speedRotation *= 0.9;
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.speedRotation;
    }
    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.timer / 240;
        ctx.save();
        ctx.translate(this.x, this.y);
        // ctx.rotate(this.rotation);
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
        ctx.globalAlpha = 1;
    }
}

export { Particle, DamageParticle, CritDamageParticle, ExplosionParticle };