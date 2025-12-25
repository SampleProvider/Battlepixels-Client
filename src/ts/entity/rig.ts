import { Entity, EntityType } from "./entity.js";
import { images, WeaponCustomization, weaponData } from "../game/loader.js";

interface Controls {
    left: boolean,
    right: boolean,
    up: boolean,
    down: boolean,
    attack: boolean,
    reload: boolean,
    angle: number,
    weapon: number,
    lastWeapon: number,
}
interface Customizations {
    shirt: number[],
    body: number[],
    pants: number[],
    pantsType: string,
    hair: number[],
    hairType: string,
}
enum AnimationType {
    Idle,
    AimUp,
    AimMiddle,
    AimDown,
    Walk,
    Run,
    Jump,
    Climb,
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
}

class Rig extends Entity {
    type = EntityType.Player;

    prerenderCanvas: OffscreenCanvas;
    prerenderCtx: OffscreenCanvasRenderingContext2D;

    controls: Controls;

    customizations: Customizations;

    animation: AnimationType;
    animationFrame: number;

    weapon: Weapon;

    hp: number;
    hpMax: number;

    name: string;

    constructor(id: number, x: number, y: number, width: number, height: number, phantomFrames: number, controls: Controls, customizations: Customizations, animation: AnimationType, animationFrame: number, weapon: Weapon, hp: number, hpMax: number, name: string) {
        super(id, x, y, width, height, phantomFrames);
        this.prerenderCanvas = new OffscreenCanvas(images.get("player").width, images.get("player").height);
        this.prerenderCtx = this.prerenderCanvas.getContext("2d");
        this.customizations = customizations;
        Rig.prerender(this.prerenderCtx, this.customizations);
        this.controls = controls;
        this.animation = animation;
        this.animationFrame = animationFrame;
        this.weapon = weapon;
        if (this.weapon.prerenderCanvas == null) {
            Rig.prerenderWeapon(this.weapon);
        }
        this.hp = hp;
        this.hpMax = hpMax;
        this.name = name;
    }

    update() {
        super.update();
    }
    draw(ctx: CanvasRenderingContext2D) {
        super.draw(ctx);
        let direction = 1;
        let angle = this.controls.angle;
        if (Math.abs(this.controls.angle) > Math.PI / 2) {
            direction = -1;
            angle = Math.PI - angle;
        }
        let frame = 0;
        let offsetY = 0;
        let drawRunningHair = false;
        switch (this.animation) {
            case AnimationType.Idle:
                // frame = 1;
                frame = 3 + (Math.floor(this.animationFrame) % 2 + 2) % 2;
                break;
            case AnimationType.AimMiddle:
                frame = 2;
                break;
            case AnimationType.Run:
                frame = 5 + (Math.floor(this.animationFrame) % 6 + 6) % 6;
                // hairFrame = 6 + Math.min(Math.floor(this.animationFrame), 3);
                if ((Math.floor(this.animationFrame) % 3 + 3) % 3 == 2) {
                    offsetY = -1;
                }
                drawRunningHair = Math.floor(this.animationFrame) > 3 || Math.floor(this.animationFrame) < -3;
                break;
            case AnimationType.Jump:
                frame = 11 + Math.min(Math.floor(this.animationFrame), 3);
                break;
            case AnimationType.Climb:
                frame = 15;
                if ((this.controls.left && direction == 1) || (this.controls.right && direction == -1)) {
                    frame = 16;
                }
                break;
        }
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(direction, 1);
        ctx.save();
        ctx.translate(0, offsetY);
        Rig.drawPlayer(ctx, this.prerenderCanvas, this.customizations, frame, drawRunningHair);
        ctx.restore();
        // ctx.drawImage(this.prerenderCanvas, frame * 16, 0, 16, 32, -8 * 4, -20 * 4 + offsetY * 4, 16 * 4, 32 * 4);
        // ctx.drawImage(this.prerenderCanvas, frame * 16, 32, 16, 32, -8 * 4, -20 * 4 + offsetY * 4, 16 * 4, 32 * 4);
        // if (this.customizations.pantsType == "skirt") {
        //     ctx.drawImage(this.prerenderCanvas, frame * 16, 32 * 3, 16, 32, -8 * 4, -20 * 4 + offsetY * 4, 16 * 4, 32 * 4);
        // }
        // else if (this.customizations.pantsType == "shorts") {
        //     ctx.drawImage(this.prerenderCanvas, frame * 16, 32 * 4, 16, 32, -8 * 4, -20 * 4 + offsetY * 4, 16 * 4, 32 * 4);
        // }
        // if (this.customizations.hairType == "short") {
        //     ctx.drawImage(this.prerenderCanvas, frame * 16, 32 * 5, 16, 32, -8 * 4, -20 * 4 + offsetY * 4, 16 * 4, 32 * 4);
        // }
        // else if (this.customizations.hairType == "long") {
        //     ctx.drawImage(this.prerenderCanvas, (drawRunningHair ? 8 : frame) * 16, 32 * 6, 16, 32, -8 * 4, -20 * 4 + offsetY * 4, 16 * 4, 32 * 4);
        // }
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
        function raycast(x1: number, y1: number, x2: number, y2: number) {
            let dx = x2 - x1;
            let dy = y2 - y1;
            let yLonger = Math.abs(dy) > Math.abs(dx);

            let shortLen = yLonger ? dx : dy;
            let longLen = yLonger ? dy : dx;

            let inc = Math.sign(longLen);

            let multDiff = shortLen / longLen;

            let cx, cy;
            var j = 0;
            if (yLonger) {
                for (let i = inc; Math.abs(i) < Math.abs(longLen); i += inc) {
                    cx = x1 + Math.round(i * multDiff);
                    cy = y1 + i;
                    // ctx.fillRect(cx, cy, 4, 4);
                    // ctx.fillRect(Math.floor(cx), Math.floor(cy), 4, 4);
                    ctx.fillRect(Math.floor(cx) - 0.5, Math.floor(cy) - 0.5, 4, 4);
                    j++;
                    if (j > 100) {
                        break;
                    }
                }
            }
            else {
                for (let i = inc; Math.abs(i) < Math.abs(longLen); i += inc) {
                    cx = x1 + i;
                    cy = y1 + Math.round(i * multDiff);
                    ctx.fillRect(Math.floor(cx) - 0.5, Math.floor(cy) - 0.5, 4, 4);
                    j++;
                    if (j > 100) {
                        break;
                    }
                }
            }
        };
        ctx.fillStyle = "#333941";
        let ax = -5 + 2.5;
        let ay = -2.5 + 3.5;
        let nax = ax * Math.cos(angle) - ay * Math.sin(angle);
        let nay = ay * Math.cos(angle) + ax * Math.sin(angle) - 1.5;
        let ax2 = -5 + 13.5;
        let ay2 = -2.5 + 3.5;
        let nax2 = ax2 * Math.cos(angle) - ay2 * Math.sin(angle);
        let nay2 = ay2 * Math.cos(angle) + ax2 * Math.sin(angle) - 1.5;
        if (this.weapon.id == "machine_gun") {
            raytrace(nax, nay, 0.5, -14/4, (x: number, y: number) => {
                ctx.fillRect(Math.floor(x) - 0.5 / 4, Math.floor(y) - 0.5 / 4, 1, 1);
            });
            raytrace(nax2, nay2, 1.5, -10/4, (x: number, y: number) => {
                ctx.fillRect(Math.floor(x) - 0.5 / 4, Math.floor(y) - 0.5 / 4, 1, 1);
            });
        }
        ctx.save();
        // ctx.translate(0, -18);
        ctx.translate(this.weapon.offsetX, this.weapon.offsetY);
        ctx.rotate(angle);
        ctx.translate(-Math.max(this.weapon.animationFrame / this.weapon.attackSpeed, 0) * 3, 0);
        // let image = images.get(weaponData[this.weapon.id].image);
        // ctx.fillStyle = "red";
        // ctx.fillRect(-1, -1, 2, 2);
        // ctx.globalAlpha = 0.5;
        // ctx.drawImage(weaponImage, -7 * 4, -5 * 4, 16 * 4, 7 * 4);
        // ctx.drawImage(weaponImage, -6 * 4, -6 * 4, 16 * 4, 7 * 4);
        // ctx.drawImage(weaponImage, -5 * 4, -2.5 * 4, 16 * 4, 7 * 4); // white fang
        // ctx.drawImage(image, weaponData[this.weapon.id].imageOffsetX * 4, weaponData[this.weapon.id].imageOffsetY * 4, image.width * 4, image.height * 4);
        let image = this.weapon.prerenderCanvas;
        ctx.drawImage(image, weaponData[this.weapon.id].imageOffsetX + this.weapon.prerenderOffsetX, weaponData[this.weapon.id].imageOffsetY + this.weapon.prerenderOffsetY, image.width, image.height);
        ctx.globalAlpha = 1;
        // ctx.drawImage(weaponImage, -7 * 4, -2.5 * 4, 16 * 4, 7 * 4);
        ctx.restore();
        // ctx.drawImage(this.prerenderCanvas, 4 * 16, 32 * 2, 16, 32, -8 * 4, -20 * 4 + offsetY * 4, 16 * 4, 32 * 4);
        ctx.restore();
        ctx.fillStyle = "gray";
        ctx.fillRect(this.x - 8.5, this.y - this.height / 2 - 3.5, 17, 2);
        ctx.fillStyle = "red";
        ctx.fillRect(this.x - 8, this.y - this.height / 2 - 3, 16 * this.hp / this.hpMax, 1);
        ctx.fillRect(-1, -1, 2, 2);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.font = "4px Miniset";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.strokeText(this.name, this.x, this.y - this.height / 2 - 4);
        ctx.fillText(this.name, this.x, this.y - this.height / 2 - 4);
    }
    static drawPlayer(ctx: CanvasRenderingContext2D, prerenderCanvas: OffscreenCanvas, customizations: Customizations, frame: number, drawRunningHair: boolean) {
        ctx.drawImage(prerenderCanvas, frame * 16, 0, 16, 32, -8, -20, 16, 32);
        ctx.drawImage(prerenderCanvas, frame * 16, 32, 16, 32, -8, -20, 16, 32);
        if (customizations.pantsType == "skirt") {
            ctx.drawImage(prerenderCanvas, frame * 16, 32 * 3, 16, 32, -8, -20, 16, 32);
        }
        else if (customizations.pantsType == "shorts") {
            ctx.drawImage(prerenderCanvas, frame * 16, 32 * 4, 16, 32, -8, -20, 16, 32);
        }
        if (customizations.hairType == "short") {
            ctx.drawImage(prerenderCanvas, frame * 16, 32 * 5, 16, 32, -8, -20, 16, 32);
        }
        else if (customizations.hairType == "long") {
            ctx.drawImage(prerenderCanvas, (drawRunningHair ? 8 : frame) * 16, 32 * 6, 16, 32, -8, -20, 16, 32);
        }
    }
    static prerender(ctx: OffscreenCanvasRenderingContext2D, customizations: Customizations) {
        let image = images.get("player");
        ctx.drawImage(image, 0, 0);
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = "rgba(" + customizations.shirt[0] + ", " + customizations.shirt[1] + ", " + customizations.shirt[2] + ", " + customizations.shirt[3] + ")";
        ctx.fillRect(0, 0, image.width, 32);
        ctx.fillStyle = "rgba(" + customizations.body[0] + ", " + customizations.body[1] + ", " + customizations.body[2] + ", " + customizations.body[3] + ")";
        ctx.fillRect(0, 32, image.width, 32 * 2);
        ctx.fillStyle = "rgba(" + customizations.pants[0] + ", " + customizations.pants[1] + ", " + customizations.pants[2] + ", " + customizations.pants[3] + ")";
        ctx.fillRect(0, 32 * 3, image.width, 32 * 2);
        ctx.fillStyle = "rgba(" + customizations.hair[0] + ", " + customizations.hair[1] + ", " + customizations.hair[2] + ", " + customizations.hair[3] + ")";
        ctx.fillRect(0, 32 * 5, image.width, 32 * 2);
    }
    static prerenderWeapon(weapon: Weapon) {
        let offsetX = 0;
        let offsetY = 0;
        let width = 0;
        let height = 0;
        let imageRects: {
            x: number,
            y: number,
            width: number,
            height: number,
            offsetX: number,
            offsetY: number,
        }[] = [];
        for (let i in weapon.customizations) {
            let customization = weaponData[weapon.id].customizations[i][weapon.customizations[i]];
            if (customization.images != null) {
                search: for (let j in customization.images) {
                    if (customization.images[j].conditions != null) {
                        for (let k in customization.images[j].conditions) {
                            if (weapon.customizations[k] != customization.images[j].conditions[k]) {
                                continue search;
                            }
                        }
                    }
                    imageRects.push({
                        x: customization.images[j].x,
                        y: customization.images[j].y,
                        width: customization.images[j].width,
                        height: customization.images[j].height,
                        offsetX: customization.images[j].offsetX,
                        offsetY: customization.images[j].offsetY,
                    });
                    offsetX = Math.min(offsetX, customization.images[j].x);
                    offsetY = Math.min(offsetY, customization.images[j].y);
                    width = Math.max(width, customization.images[j].offsetX + customization.images[j].width);
                    height = Math.max(height, customization.images[j].offsetY + customization.images[j].height);
                }
            }
            if (customization.imageX != null) {
                imageRects.push({
                    x: customization.imageX,
                    y: customization.imageY,
                    width: customization.imageWidth,
                    height: customization.imageHeight,
                    offsetX: customization.imageOffsetX,
                    offsetY: customization.imageOffsetY,
                });
                offsetX = Math.min(offsetX, customization.imageX);
                offsetY = Math.min(offsetY, customization.imageY);
                width = Math.max(width, customization.imageOffsetX + customization.imageWidth);
                height = Math.max(height, customization.imageOffsetY + customization.imageHeight);
            }
        }
        let image = images.get(weaponData[weapon.id].image);
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
        }
        weapon.prerenderCanvas = new OffscreenCanvas(width, height);
        weapon.prerenderCtx = weapon.prerenderCanvas.getContext("2d");
        weapon.prerenderOffsetX = offsetX;
        weapon.prerenderOffsetY = offsetY;
        for (let i in imageRects) {
            weapon.prerenderCtx.drawImage(image, imageRects[i].x - offsetX, imageRects[i].y - offsetY, imageRects[i].width, imageRects[i].height, imageRects[i].offsetX, imageRects[i].offsetY, imageRects[i].width, imageRects[i].height);
        }
    }
}

export { Rig, Customizations, Controls, AnimationType, Weapon };