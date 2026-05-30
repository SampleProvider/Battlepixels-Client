import { serverIp } from "../../index.js";
import { images } from "../game/loader.js";
import { WeaponItem } from "../ui/item.js";
import { EntityType } from "./entity.js";
import { Rig, Controls, UVImage } from "./rig.js";
import { Collision } from "../map/map.js";

interface WeaponCustomization {
    inputX: number,
    inputY: number,
    options: {
        [key: string]: {
            name: string,
            images?: {
                conditions?: {
                    [key: string]: string,
                },
                x: number,
                y: number,
                width: number,
                height: number,
                offsetX: number,
                offsetY: number,
            }[],
            imageX?: number,
            imageY?: number,
            imageWidth?: number,
            imageHeight?: number,
            imageOffsetX?: number,
            imageOffsetY?: number,
            damage?: number,
            critDamage?: number,
            knockback?: number,
            piercing?: number,
            attackSpeed?: number,
            projectileSpeed?: number,
            projectileCount?: number,
            projectileSpread?: number,
            recoil?: number,
            ammoMax?: number,
            reloadSpeed?: number,
        },
    },
}
interface WeaponProjectile {
    weight: number,
    damage?: number,
    critDamage?: number,
    knockback?: number,
    piercing?: number,
    attackSpeed?: number,
    projectileSpeed?: number,
    projectileCount?: number,
    projectileSpread?: number,
    recoil?: number,
    ammoMax?: number,
    reloadSpeed?: number,
}
interface WeaponData {
    name: string,
    type: string,
    image: string,
    imageOffsetX: number,
    imageOffsetY: number,
    offsetX: number,
    offsetY: number,
    damage: number,
    critDamage: number,
    knockback: number,
    piercing: number,
    attackSpeed: number,
    projectile?: string,
    projectiles?: {
        [key: string]: WeaponProjectile
    },
    projectileSpeed: number,
    projectileCount: number,
    projectileSpread: number,
    recoil: number,
    ammoMax: number,
    reloadSpeed: number,
    customizations: {
        [key: string]: WeaponCustomization,
    },
}
enum WeaponAnimationType {
    Attack,
    Reload,
}
interface Weapon {
    id: string,
    offsetX: number,
    offsetY: number,
    animation: WeaponAnimationType,
    animationFrame: number,
    damage: number,
    critDamage: number,
    knockback: number,
    piercing: number,
    attackSpeed: number,
    projectileSpeed: number,
    projectileCount: number,
    projectileSpread: number,
    recoil: number,
    ammo: number,
    ammoMax: number,
    reloadSpeed: number,
    customizations: {
        [key: string]: string,
    },
    prerenderCanvas: OffscreenCanvas,
    prerenderCtx: OffscreenCanvasRenderingContext2D,
    prerenderOffsetX: number,
    prerenderOffsetY: number,
    prerenderMaxWidth: number,
    prerenderMaxHeight: number,
}

class Player extends Rig {
    type = EntityType.Player;

    weapon: Weapon;

    constructor(id: number, x: number, y: number, width: number, height: number, phantomFrames: number, dashTime: number, controls: Controls, collision: Collision, image: string | UVImage, animationFrame: number, animationRotation: number, hp: number, hpMax: number, drawHp: boolean, name: string, drawName: boolean, weapon: Weapon) {
        super(id, x, y, width, height, phantomFrames, dashTime, controls, collision, image, 15, 30, 0, -5, animationFrame, animationRotation, hp, hpMax, drawHp, name, drawName);
        this.weapon = weapon;
        if (this.weapon != null && this.weapon.prerenderCanvas == null) {
            Player.prerenderWeapon(this.weapon);
        }
    }

    drawOcclusion(ctx: OffscreenCanvasRenderingContext2D) {
        if (this.hp == 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.animationRotation);
            let image = images.get("gravestone");
            ctx.drawImage(image, this.imageOffsetX - this.imageWidth / 2, this.imageOffsetY - this.imageHeight / 2, this.imageWidth, this.imageHeight);
            ctx.restore();
        }
        super.drawOcclusion(ctx);
    }
    draw(belowCtx: OffscreenCanvasRenderingContext2D, aboveCtx: OffscreenCanvasRenderingContext2D, entityLightCanvas: OffscreenCanvas) {
        if (this.hp == 0) {
            belowCtx.save();
            belowCtx.translate(this.x, this.y);
            belowCtx.rotate(this.animationRotation);
            let image = images.get("gravestone");
            belowCtx.drawImage(image, this.imageOffsetX - this.imageWidth / 2, this.imageOffsetY - this.imageHeight / 2, this.imageWidth, this.imageHeight);
            belowCtx.restore();
        }
        super.draw(belowCtx, aboveCtx, entityLightCanvas);
        if (this.hp == 0) {
            return;
        }

        if (this.weapon == null) {
            return;
        }
        let direction = 1;
        let angle = this.controls.angle;
        if (Math.abs(this.controls.angle) > Math.PI / 2) {
            direction = -1;
            angle = Math.PI - angle;
        }
        belowCtx.save();
        belowCtx.translate(this.x, this.y);
        belowCtx.rotate(this.animationRotation);
        belowCtx.scale(direction, 1);
        function raytrace(x1: number, y1: number, x2: number, y2: number, action: Function) {
            x1 = Math.floor(x1);
            y1 = Math.floor(y1);
            x2 = Math.floor(x2);
            y2 = Math.floor(y2);
            let slope = (y2 - y1) / (x2 - x1);
            if (slope == 0) {
                let minX = Math.min(x1, x2);
                let maxX = Math.max(x1, x2);
                for (let x = minX; x <= maxX; x++) {
                    action(x, y1);
                }
            }
            else if (!isFinite(slope)) {
                let minY = Math.min(y1, y2);
                let maxY = Math.max(y1, y2);
                for (let y = minY; y <= maxY; y++) {
                    action(x1, y);
                }
            }
            else if (Math.abs(slope) < 1) {
                let startY = x2 < x1 ? y2 : y1;
                let minX = Math.min(x1, x2);
                let maxX = Math.max(x1, x2);
                for (let x = minX; x <= maxX; x++) {
                    let y = Math.round(slope * (x - minX)) + startY;
                    action(x, y);
                }
            }
            else {
                slope = (x2 - x1) / (y2 - y1);
                let startX = y2 < y1 ? x2 : x1;
                let minY = Math.min(y1, y2);
                let maxY = Math.max(y1, y2);
                for (let y = minY; y <= maxY; y++) {
                    let x = Math.round(slope * (y - minY)) + startX;
                    action(x, y);
                }
            }
        };
        belowCtx.fillStyle = "#333941";
        let ax = -5 + 2.5;
        let ay = -2.5 + 3.5;
        let nax = ax * Math.cos(angle) - ay * Math.sin(angle);
        let nay = ay * Math.cos(angle) + ax * Math.sin(angle) - 1.5;
        let ax2 = -5 + 13.5;
        let ay2 = -2.5 + 3.5;
        let nax2 = ax2 * Math.cos(angle) - ay2 * Math.sin(angle);
        let nay2 = ay2 * Math.cos(angle) + ax2 * Math.sin(angle) - 1.5;
        if (this.weapon.id == "machine_gun") {
            let offscreenCanvas = new OffscreenCanvas(1, 1);
            let offscreenCtx = offscreenCanvas.getContext("2d");
            offscreenCtx.fillStyle = "#333941";
            offscreenCtx.fillRect(0, 0, 1, 1);
            raytrace(nax, nay, 0.5, -14/4, (x: number, y: number) => {
                // belowCtx.fillRect(Math.floor(x) - 0.5 / 4, Math.floor(y) - 0.5 / 4, 1, 1);
                // belowCtx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
                belowCtx.drawImage(offscreenCanvas, Math.floor(x), Math.floor(y), 1, 1);
            });
            raytrace(nax2, nay2, 1.5, -10/4, (x: number, y: number) => {
                // belowCtx.fillRect(Math.floor(x) - 0.5 / 4, Math.floor(y) - 0.5 / 4, 1, 1);
                // belowCtx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
                belowCtx.drawImage(offscreenCanvas, Math.floor(x), Math.floor(y), 1, 1);
            });
        }
        if (this.weapon.id == "pastry_machine_gun") {
            let offscreenCanvas = new OffscreenCanvas(1, 1);
            let offscreenCtx = offscreenCanvas.getContext("2d");
            offscreenCtx.fillStyle = "#403353";
            offscreenCtx.fillRect(0, 0, 1, 1);
            raytrace(nax, nay, 0.5, -14/4, (x: number, y: number) => {
                // belowCtx.fillRect(Math.floor(x) - 0.5 / 4, Math.floor(y) - 0.5 / 4, 1, 1);
                // belowCtx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
                belowCtx.drawImage(offscreenCanvas, Math.floor(x), Math.floor(y), 1, 1);
            });
            raytrace(nax2, nay2, 1.5, -10/4, (x: number, y: number) => {
                // belowCtx.fillRect(Math.floor(x) - 0.5 / 4, Math.floor(y) - 0.5 / 4, 1, 1);
                // belowCtx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
                belowCtx.drawImage(offscreenCanvas, Math.floor(x), Math.floor(y), 1, 1);
            });
        }
        belowCtx.save();
        // belowCtx.translate(0, -18);
        belowCtx.translate(this.weapon.offsetX, this.weapon.offsetY);
        if (((this.animationFrame >= 0 && this.animationFrame < 6) || (this.animationFrame >= 11 && this.animationFrame < 17)) && Math.floor(this.animationFrame) % 3 == 1) {
            belowCtx.translate(0, -1);
        }
        belowCtx.rotate(angle);
        belowCtx.translate(-Math.max(this.weapon.animationFrame / this.weapon.attackSpeed, 0) * 3, 0);
        // let image = images.get(WeaponItem.data[this.weapon.id].image);
        // belowCtx.drawImage(weaponImage, -7 * 4, -5 * 4, 16 * 4, 7 * 4);
        // belowCtx.drawImage(weaponImage, -6 * 4, -6 * 4, 16 * 4, 7 * 4);
        // belowCtx.drawImage(weaponImage, -5 * 4, -2.5 * 4, 16 * 4, 7 * 4); // white fang
        // belowCtx.drawImage(image, WeaponItem.data[this.weapon.id].imageOffsetX * 4, WeaponItem.data[this.weapon.id].imageOffsetY * 4, image.width * 4, image.height * 4);
        let image = this.weapon.prerenderCanvas;
        // belowCtx.globalAlpha = 0.2;
        belowCtx.drawImage(image, WeaponItem.data[this.weapon.id].imageOffsetX + this.weapon.prerenderOffsetX, WeaponItem.data[this.weapon.id].imageOffsetY + this.weapon.prerenderOffsetY, image.width, image.height);
        // belowCtx.drawImage(weaponImage, -7 * 4, -2.5 * 4, 16 * 4, 7 * 4);
        // belowCtx.globalAlpha = 1;
        belowCtx.restore();
        belowCtx.restore();
        // belowCtx.drawImage(this.prerenderCanvas, 4 * 16, 32 * 2, 16, 32, -8 * 4, -20 * 4 + offsetY * 4, 16 * 4, 32 * 4);
        // if (renderer instanceof OffscreenCanvasMapRenderer) {
        //     renderer.occlusionCtx.save();
        //     renderer.occlusionCtx.translate(this.x, this.y);
        //     renderer.occlusionCtx.scale(direction, 1);
        //     renderer.occlusionCtx.translate(this.weapon.offsetX, this.weapon.offsetY);
        //     renderer.occlusionCtx.rotate(angle);
        //     renderer.occlusionCtx.translate(-Math.max(this.weapon.animationFrame / this.weapon.attackSpeed, 0) * 3, 0);
        //     renderer.occlusionCtx.drawImage(image, WeaponItem.data[this.weapon.id].imageOffsetX + this.weapon.prerenderOffsetX, WeaponItem.data[this.weapon.id].imageOffsetY + this.weapon.prerenderOffsetY, image.width, image.height);
        //     renderer.occlusionCtx.restore();
        // }
        // belowCtx.save();
        // belowCtx.translate(this.x, this.y);
        // belowCtx.rotate(Math.atan2(this.speedY, this.speedX));
        // let gliderImage = images.get("glider");
        // belowCtx.drawImage(gliderImage, -gliderImage.width / 2, -20, gliderImage.width, gliderImage.height);
        // belowCtx.restore();
    }
    drawImage(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
        let armFrame = 0;
        if (this.weapon != null) {
            if (Math.abs(this.controls.angle + Math.PI / 2) < Math.PI / 3) {
                armFrame = 1;
            }
            else if (Math.abs(this.controls.angle + Math.PI / 2) < Math.PI * 2 / 3 || this.controls.angle > Math.PI * 5 / 6) {
                armFrame = 2;
            }
            else {
                armFrame = 3;
            }
            if (WeaponItem.data[this.weapon.id].holdAnimation == "underhand") {
                armFrame += 3;
            }
        }
        for (let i = 0; i < this.image.height / this.imageHeight; i++) {
            if (i >= 1 && i < 8 && i != 1 + armFrame) {
                continue;
            }
            if (i >= 10 && i < 17 && i != 10 + armFrame) {
                continue;
            }
            ctx.drawImage(this.image, Math.floor(this.animationFrame) * this.imageWidth, i * this.imageHeight, this.imageWidth, this.imageHeight, this.imageOffsetX - this.imageWidth / 2, this.imageOffsetY - this.imageHeight / 2, this.imageWidth, this.imageHeight);
        }
    }

    static prerenderWeapon(weapon: Weapon) {
        let offsetX = 0;
        let offsetY = 0;
        let width = 0;
        let height = 0;
        let maxWidth = 0;
        let maxHeight = 0;
        let imageRects: {
            x: number,
            y: number,
            width: number,
            height: number,
            offsetX: number,
            offsetY: number,
        }[] = [];
        for (let i in weapon.customizations) {
            // let customization = WeaponItem.data[weapon.id].customizations[i].options[weapon.customizations[i]];
            // if (customization.images != null) {
            //     search: for (let j in customization.images) {
            //         if (customization.images[j].conditions != null) {
            //             for (let k in customization.images[j].conditions) {
            //                 if (weapon.customizations[k] != customization.images[j].conditions[k]) {
            //                     continue search;
            //                 }
            //             }
            //         }
            //         imageRects.push({
            //             x: customization.images[j].x,
            //             y: customization.images[j].y,
            //             width: customization.images[j].width,
            //             height: customization.images[j].height,
            //             offsetX: customization.images[j].offsetX,
            //             offsetY: customization.images[j].offsetY,
            //         });
            //         offsetX = Math.min(offsetX, customization.images[j].x);
            //         offsetY = Math.min(offsetY, customization.images[j].y);
            //         width = Math.max(width, customization.images[j].offsetX + customization.images[j].width);
            //         height = Math.max(height, customization.images[j].offsetY + customization.images[j].height);
            //     }
            // }
            // if (customization.imageX != null) {
            //     imageRects.push({
            //         x: customization.imageX,
            //         y: customization.imageY,
            //         width: customization.imageWidth,
            //         height: customization.imageHeight,
            //         offsetX: customization.imageOffsetX,
            //         offsetY: customization.imageOffsetY,
            //     });
            //     offsetX = Math.min(offsetX, customization.imageX);
            //     offsetY = Math.min(offsetY, customization.imageY);
            //     width = Math.max(width, customization.imageOffsetX + customization.imageWidth);
            //     height = Math.max(height, customization.imageOffsetY + customization.imageHeight);
            // }
            // for (let j in WeaponItem.data[weapon.id].customizations[i].options) {
            //     let customization = WeaponItem.data[weapon.id].customizations[i].options[j];
            //     if (customization.images != null) {
            //         for (let k in customization.images) {
            //             maxWidth = Math.max(maxWidth, customization.images[k].offsetX + customization.images[k].width);
            //             maxHeight = Math.max(maxHeight, customization.images[k].offsetY + customization.images[k].height);
            //         }
            //     }
            //     if (customization.imageX != null) {
            //         maxWidth = Math.max(maxWidth, customization.imageOffsetX + customization.imageWidth);
            //         maxHeight = Math.max(maxHeight, customization.imageOffsetY + customization.imageHeight);
            //     }
            // }
        }
        let image = images.get(WeaponItem.data[weapon.id].image);
        if (imageRects.length == 0) {
            imageRects.push({
                x: 0,
                y: 0,
                width: image.width,
                height: image.height,
                offsetX: 0,
                offsetY: 0,
            });
            width = image.width;
            height = image.height;
            maxWidth = image.width;
            maxHeight = image.height;
        }
        weapon.prerenderCanvas = new OffscreenCanvas(width, height);
        weapon.prerenderCtx = weapon.prerenderCanvas.getContext("2d");
        weapon.prerenderOffsetX = offsetX;
        weapon.prerenderOffsetY = offsetY;
        weapon.prerenderMaxWidth = maxWidth;
        weapon.prerenderMaxHeight = maxHeight;
        for (let i in imageRects) {
            weapon.prerenderCtx.drawImage(image, imageRects[i].x - offsetX, imageRects[i].y - offsetY, imageRects[i].width, imageRects[i].height, imageRects[i].offsetX, imageRects[i].offsetY, imageRects[i].width, imageRects[i].height);
        }
    }
}

export { Player, WeaponData, Weapon };