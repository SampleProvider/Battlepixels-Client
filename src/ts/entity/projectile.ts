import { images } from "../game/loader.js";
import { Entity, EntityType } from "./entity.js";
import { serverIp } from "../../index.js";

interface ProjectileData {
    image: string,
    imageX?: number,
    imageY?: number,
    imageWidth?: number,
    imageHeight?: number,
    imageOffsetX?: number,
    imageOffsetY?: number,
    width: number,
    height: number,
    phantomFrames: number,
    despawnTime: number,
    gravity: number,
    changeRotation: boolean,
    collisionEvents: CollisionEvent[],
}

interface CollisionEvent {
    type: string,
    data: any,
}

class Projectile extends Entity {
    type = EntityType.Projectile;

    projectileType: string;

    rotation: number;
    speedRotation = 0;

    static data: {[key: string]: ProjectileData} = {};

    constructor(id: number, x: number, y: number, width: number, height: number, phantomFrames: number, projectileType: string, rotation: number) {
        super(id, x, y, width, height, phantomFrames);
        this.projectileType = projectileType;
        this.rotation = rotation;
    }

    update(frameTime: number) {
        this.rotation += this.speedRotation * Math.min(this.interpolationFrames, frameTime);
        super.update(frameTime);
    }
    draw(belowCtx: OffscreenCanvasRenderingContext2D, aboveCtx: OffscreenCanvasRenderingContext2D, entityLightCanvas: OffscreenCanvas) {
        super.draw(belowCtx, aboveCtx, entityLightCanvas);
        belowCtx.save();
        belowCtx.translate(this.x, this.y);
        belowCtx.rotate(this.rotation);
        let image = images.get(Projectile.data[this.projectileType].image);
        belowCtx.drawImage(image, Projectile.data[this.projectileType].imageX ?? 0, Projectile.data[this.projectileType].imageY ?? 0, Projectile.data[this.projectileType].imageWidth ?? image.width, Projectile.data[this.projectileType].imageHeight ?? image.height, Projectile.data[this.projectileType].imageOffsetX ?? 0 - (Projectile.data[this.projectileType].imageWidth ?? image.width) / 2, Projectile.data[this.projectileType].imageOffsetY ?? 0 - (Projectile.data[this.projectileType].imageHeight ?? image.height) / 2, Projectile.data[this.projectileType].imageWidth ?? image.width, Projectile.data[this.projectileType].imageHeight ?? image.height);
        belowCtx.restore();
    }

    static async load() {
        Projectile.data = await (await fetch(serverIp + "assets/projectiles.json")).json();
        for (let i in Projectile.data) {
            let image = new Image();
            image.src = "/src/img/" + Projectile.data[i].image;
            images.set(Projectile.data[i].image, image);
        }
    }
}

export { Projectile };