import { Entity, EntityType } from "./entity.js";
import { images, projectileData } from "../game/loader.js";

class Projectile extends Entity {
    type = EntityType.Projectile;

    projectileType: string;

    rotation: number;
    speedRotation = 0;

    constructor(id: number, x: number, y: number, width: number, height: number, phantomFrames: number, projectileType: string, rotation: number) {
        super(id, x, y, width, height, phantomFrames);
        this.projectileType = projectileType;
        this.rotation = rotation;
    }

    update() {
        if (this.interpolationFrames > 0) {
            this.rotation += this.speedRotation;
        }
        super.update();
    }
    draw(ctx: CanvasRenderingContext2D) {
        super.draw(ctx);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        let image = images.get(projectileData[this.projectileType].image);
        ctx.drawImage(image, projectileData[this.projectileType].imageX ?? 0, projectileData[this.projectileType].imageY ?? 0, projectileData[this.projectileType].imageWidth ?? image.width, projectileData[this.projectileType].imageHeight ?? image.height, projectileData[this.projectileType].imageOffsetX ?? 0 - (projectileData[this.projectileType].imageWidth ?? image.width) / 2, projectileData[this.projectileType].imageOffsetY ?? 0 - (projectileData[this.projectileType].imageHeight ?? image.height) / 2, projectileData[this.projectileType].imageWidth ?? image.width, projectileData[this.projectileType].imageHeight ?? image.height);
        ctx.restore();
    }
}

export { Projectile };