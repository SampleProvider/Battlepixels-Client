import { cameraX, cameraY, cameraScale } from "../game/camera.js";
import type { MapRenderer } from "./renderer.js";

class BackgroundEntity {
    id = Math.random();
    x: number;
    y: number;
    speedX = 0;
    speedY = 0;
    width: number;
    height: number;

    parallaxFactor: number;

    static list = new Map<number, BackgroundEntity>();

    constructor(x: number, y: number, width: number, height: number, parallaxFactor: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.parallaxFactor = parallaxFactor;

        BackgroundEntity.list.set(this.id, this);
    }

    update(frameTime: number) {
        this.x += this.speedX * frameTime;
        this.y += this.speedY * frameTime;
    }
    draw(belowCtx: OffscreenCanvasRenderingContext2D) {
        belowCtx.strokeStyle = "red";
        belowCtx.lineWidth = 1 / cameraScale;
        if ("rotation" in this) {
            belowCtx.save();
            belowCtx.translate(this.x, this.y);
            belowCtx.rotate(this.rotation as number);
            belowCtx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
            belowCtx.restore();
        }
        else {
            belowCtx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        }
    }
    remove() {
        BackgroundEntity.list.delete(this.id);
    }

    static updateAll(frameTime: number) {
        for (let [_, backgroundEntity] of BackgroundEntity.list) {
            backgroundEntity.update(frameTime);
        }
    }
    static drawAll(belowCtx: OffscreenCanvasRenderingContext2D, renderer: MapRenderer) {
        const sorted = new Map([...BackgroundEntity.list].sort((a, b) => {
            return b[1].parallaxFactor - a[1].parallaxFactor; 
        }));
        for (let [_, backgroundEntity] of sorted) {
            let targetX = belowCtx.canvas.width / cameraScale / 2 - renderer.map.width * 8 / 2;
            let targetY = belowCtx.canvas.height / cameraScale / 2 - renderer.map.height * 8 / 2;
            belowCtx.save();
            belowCtx.scale(cameraScale, cameraScale);
            belowCtx.translate((targetX - cameraX) * backgroundEntity.parallaxFactor + cameraX, (targetY - cameraY) * backgroundEntity.parallaxFactor + cameraY);
            backgroundEntity.draw(belowCtx);
            belowCtx.restore();
        }
    }
}

export { BackgroundEntity };