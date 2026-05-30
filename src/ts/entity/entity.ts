import { cameraScale } from "../game/camera.js";

enum EntityType {
    Entity,
    Rig,
    Player,
    Npc,
    Monster,
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
    firstUpdate = true;

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
    remove() {
        Entity.list.delete(this.id);
    }

    update(frameTime: number) {
        this.x += this.speedX * Math.min(this.interpolationFrames, frameTime);
        this.y += this.speedY * Math.min(this.interpolationFrames, frameTime);
        this.interpolationFrames -= Math.min(this.interpolationFrames, frameTime);
    }
    drawOcclusion(ctx: OffscreenCanvasRenderingContext2D) {
    }
    draw(belowCtx: OffscreenCanvasRenderingContext2D, aboveCtx: OffscreenCanvasRenderingContext2D, entityLightCanvas: OffscreenCanvas) {
        // belowCtx.strokeStyle = "red";
        // belowCtx.lineWidth = 1 / cameraScale;
        // if ("rotation" in this) {
        //     belowCtx.save();
        //     belowCtx.translate(this.x, this.y);
        //     belowCtx.rotate(this.rotation as number);
        //     belowCtx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
        //     belowCtx.restore();
        // }
        // else {
        //     belowCtx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        // }
    }

    static updateAll(frameTime: number) {
        for (let [_, entity] of Entity.list) {
            if (entity.firstUpdate) {
                entity.firstUpdate = false;
                continue;
            }
            entity.update(frameTime);
        }
    }
    static drawOcclusionAll(ctx: OffscreenCanvasRenderingContext2D) {
        for (let [_, entity] of Entity.list) {
            if (entity.phantomFrames == 1) {
                entity.drawOcclusion(ctx);
            }
            else {
                entity.x -= entity.speedX;
                entity.y -= entity.speedY;
                for (let j = 0; j < entity.phantomFrames; j++) {
                    entity.x += entity.speedX / entity.phantomFrames;
                    entity.y += entity.speedY / entity.phantomFrames;
                    ctx.globalAlpha = (j + 1) / entity.phantomFrames;
                    entity.drawOcclusion(ctx);
                }
                ctx.globalAlpha = 1;
            }
        }
    }
    static drawAll(belowCtx: OffscreenCanvasRenderingContext2D, aboveCtx: OffscreenCanvasRenderingContext2D, entityLightCanvas: OffscreenCanvas) {
        for (let [_, entity] of Entity.list) {
            entity.phantomFrames = 1;
            if (entity.phantomFrames == 1) {
                entity.draw(belowCtx, aboveCtx, entityLightCanvas);
            }
            else {
                entity.x -= entity.speedX;
                entity.y -= entity.speedY;
                for (let j = 0; j < entity.phantomFrames; j++) {
                    entity.x += entity.speedX / entity.phantomFrames;
                    entity.y += entity.speedY / entity.phantomFrames;
                    belowCtx.globalAlpha = (j + 1) / entity.phantomFrames;
                    aboveCtx.globalAlpha = (j + 1) / entity.phantomFrames;
                    entity.draw(belowCtx, aboveCtx, entityLightCanvas);
                }
                belowCtx.globalAlpha = 1;
                aboveCtx.globalAlpha = 1;
            }
        }
    }
}

export { Entity, EntityType };