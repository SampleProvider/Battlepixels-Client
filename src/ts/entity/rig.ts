import { images } from "../game/loader.js";
import { Entity, EntityType } from "./entity.js";
import { Collision } from "../map/map.js";

interface Controls {
    left: boolean,
    right: boolean,
    up: boolean,
    down: boolean,
    attack: boolean,
    reload: boolean,
    walk: boolean,
    angle: number,
    weapon: number,
}
interface UVImage {
    uvLookup: string,
    uvSource: string,
    colorLookup: string | Uint8ClampedArray,
}

class Rig extends Entity {
    type = EntityType.Rig;

    dashTime: number;
    dashTrails: {
        x: number,
        y: number,
        animationFrame: number,
        animationRotation: number,
        opacity: number,
    }[] = [];

    controls: Controls;

    image: HTMLImageElement | OffscreenCanvas;
    outlineImage: HTMLImageElement | OffscreenCanvas;
    imageWidth: number;
    imageHeight: number;
    imageOffsetX: number;
    imageOffsetY: number;

    collision: Collision;

    animationFrame: number;
    animationRotation: number;
    animationSpeedRotation: number;

    hp: number;
    hpMax: number;
    drawHp: boolean;

    name: string;
    drawName: boolean;

    static list = new Map<number, Rig>();

    static prerenderCache = new Map<HTMLImageElement | OffscreenCanvas | string, OffscreenCanvas>();

    constructor(id: number, x: number, y: number, width: number, height: number, phantomFrames: number, dashTime: number, controls: Controls, collision: Collision, image: string | UVImage, imageWidth: number, imageHeight: number, imageOffsetX: number, imageOffsetY: number, animationFrame: number, animationRotation: number, hp: number, hpMax: number, drawHp: boolean, name: string, drawName: boolean) {
        super(id, x, y, width, height, phantomFrames);

        this.dashTime = dashTime;

        this.controls = controls;

        this.setImage(image);
        this.imageWidth = imageWidth;
        this.imageHeight = imageHeight;
        this.imageOffsetX = imageOffsetX;
        this.imageOffsetY = imageOffsetY;

        this.collision = collision;

        this.animationFrame = animationFrame;
        this.animationRotation = animationRotation;
        this.hp = hp;
        this.hpMax = hpMax;
        this.drawHp = drawHp;
        this.name = name;
        this.drawName = drawName;

        Rig.list.set(this.id, this);
    }
    remove() {
        super.remove();
        Rig.list.delete(this.id);
    }
    
    update(frameTime: number) {
        if (this.dashTime > 0 && this.interpolationFrames != 0) {
            this.dashTrails.push({
                x: this.x,
                y: this.y,
                animationFrame: this.animationFrame,
                animationRotation: this.animationRotation,
                opacity: 1,
            });
        }
        for (let i = 0; i < this.dashTrails.length; i++) {
            this.dashTrails[i].opacity -= Math.min(this.interpolationFrames, frameTime) / 10;
            if (this.dashTrails[i].opacity <= 0) {
                this.dashTrails.splice(i, 1);
                i -= 1;
                continue;
            }
        }
        this.animationRotation += this.animationSpeedRotation * Math.min(this.interpolationFrames, frameTime);
        super.update(frameTime);
        if (this.collision != null) {
            this.collision.x = this.x;
            this.collision.y = this.y;
            this.collision.width = this.width;
            this.collision.height = this.height;
        }
    }
    drawOcclusion(ctx: OffscreenCanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));
        ctx.rotate(this.animationRotation);
        this.drawImage(ctx);
        ctx.restore();
    }
    draw(belowCtx: OffscreenCanvasRenderingContext2D, aboveCtx: OffscreenCanvasRenderingContext2D, entityLightCanvas: OffscreenCanvas) {
        let animationFrame = this.animationFrame;
        for (let i = 0; i < this.dashTrails.length; i++) {
            belowCtx.globalAlpha = this.dashTrails[i].opacity;
            belowCtx.save();
            belowCtx.translate(this.dashTrails[i].x, this.dashTrails[i].y);
            belowCtx.rotate(this.dashTrails[i].animationRotation);
            this.animationFrame = this.dashTrails[i].animationFrame;
            this.drawImage(belowCtx);
            belowCtx.restore();
        }
        this.animationFrame = animationFrame;
        belowCtx.globalAlpha = 1;

        super.draw(belowCtx, aboveCtx, entityLightCanvas);
        belowCtx.save();
        belowCtx.translate(this.x, this.y);
        belowCtx.rotate(this.animationRotation);
        this.drawImage(belowCtx);
        if (entityLightCanvas != null) {
            belowCtx.drawImage(entityLightCanvas, Math.round(this.x) - 8, Math.round(this.y) - 20, 16, 32, -8, -20, 16, 32);
        }
        belowCtx.restore();
        let height = 0;
        if (this.hp == 0) {
            height += 8;
        }
        if (this.drawHp && this.hp > 0) {
            // aboveCtx.drawImage(images.get("healthbar"), 0, 0, 18, 4, this.x - 9, this.y - this.height / 2 + height - 6, 18, 4);
            // aboveCtx.drawImage(images.get("healthbar"), 1, 5, 16 * this.hp / this.hpMax, 2, this.x - 8, this.y - this.height / 2 + height - 5, 16 * this.hp / this.hpMax, 2);
            aboveCtx.lineJoin = "round";
            aboveCtx.lineCap = "round";
            aboveCtx.lineWidth = 1.5;
            aboveCtx.strokeStyle = "#000000";
            aboveCtx.strokeRect(this.x - 8, this.y - this.height / 2 + height - 4, 16, 0);
            aboveCtx.lineWidth = 0.5;
            aboveCtx.strokeStyle = "#333941";
            aboveCtx.strokeRect(this.x - 8, this.y - this.height / 2 + height - 4, 16, 0);
            aboveCtx.strokeStyle = "#df3e23";
            aboveCtx.strokeRect(this.x - 8, this.y - this.height / 2 + height - 4, 16 * this.hp / this.hpMax, 0);
            height -= 6;
        }
        if (this.drawName) {
            aboveCtx.fillStyle = "#ffffff";
            aboveCtx.strokeStyle = "#000000";
            aboveCtx.lineWidth = 1;
            aboveCtx.lineJoin = "round";
            aboveCtx.lineCap = "round";
            aboveCtx.font = "4px Google Sans Normal";
            aboveCtx.textAlign = "center";
            aboveCtx.textBaseline = "bottom";
            aboveCtx.strokeText(this.name, this.x, this.y - this.height / 2 + height);
            aboveCtx.fillText(this.name, this.x, this.y - this.height / 2 + height);
        }
    }
    drawImage(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
        for (let i = 0; i < this.image.height / this.imageHeight; i++) {
            ctx.drawImage(this.image, Math.floor(this.animationFrame) * this.imageWidth, i * this.imageHeight, this.imageWidth, this.imageHeight, this.imageOffsetX - this.imageWidth / 2, this.imageOffsetY - this.imageHeight / 2, this.imageWidth, this.imageHeight);
        }
    }
    async setImage(image: string | UVImage) {
        if (typeof image == "string") {
            this.image = images.get(image);
        }
        else if (typeof image.colorLookup == "string") {
            this.image = await Rig.prerender(images.get(image.uvLookup), images.get(image.uvSource), images.get(image.colorLookup), null);
        }
        else {
            this.image = await Rig.prerender(images.get(image.uvLookup), images.get(image.uvSource), null, image.colorLookup);
        }
    }
    static async hashArray(array: Uint8ClampedArray) {
        const msgUint8 = new TextEncoder().encode(JSON.stringify(array)); 
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    }
    static async prerender(uvLookup: HTMLImageElement | OffscreenCanvas, uvSource: HTMLImageElement | OffscreenCanvas, colorLookup: HTMLImageElement | OffscreenCanvas, colorLookupData: Uint8ClampedArray) {
        let hashedArray: string;
        if (colorLookup != null) {
            if (Rig.prerenderCache.has(colorLookup)) {
                return Rig.prerenderCache.get(colorLookup);
            }
        }
        else {
            hashedArray = await Rig.hashArray(colorLookupData);
            if (Rig.prerenderCache.has(hashedArray)) {
                return Rig.prerenderCache.get(hashedArray);
            }
        }
        let colorMap = new Map<string, Uint8ClampedArray>();
        let uvLookupCanvas = new OffscreenCanvas(uvLookup.width, uvLookup.height);
        let uvLookupCtx = uvLookupCanvas.getContext("2d");
        uvLookupCtx.drawImage(uvLookup, 0, 0);
        let uvLookupData = uvLookupCtx.getImageData(0, 0, uvLookup.width, uvLookup.height).data;

        if (colorLookup != null) {
            let colorLookupCanvas = new OffscreenCanvas(uvLookup.width, uvLookup.height);
            let colorLookupCtx = colorLookupCanvas.getContext("2d");
            colorLookupCtx.drawImage(colorLookup, 0, 0);

            let colorLookupData = colorLookupCtx.getImageData(0, 0, uvLookup.width, uvLookup.height).data;
            for (let y = 0; y < uvLookup.height; y++) {
                for (let x = 0; x < uvLookup.width; x++) {
                    if (uvLookupData.subarray((x + y * uvLookup.width) * 4, (x + y * uvLookup.width) * 4 + 4)[3] != 0) {
                        colorMap.set(uvLookupData.subarray((x + y * uvLookup.width) * 4, (x + y * uvLookup.width) * 4 + 4).toString(), colorLookupData.subarray((x + y * uvLookup.width) * 4, (x + y * uvLookup.width) * 4 + 4))
                    }
                }
            }
        }
        else {
            for (let y = 0; y < uvLookup.height; y++) {
                for (let x = 0; x < uvLookup.width; x++) {
                    if (uvLookupData.subarray((x + y * uvLookup.width) * 4, (x + y * uvLookup.width) * 4 + 4)[3] != 0) {
                        colorMap.set(uvLookupData.subarray((x + y * uvLookup.width) * 4, (x + y * uvLookup.width) * 4 + 4).toString(), colorLookupData.subarray((x + y * uvLookup.width) * 4, (x + y * uvLookup.width) * 4 + 4))
                    }
                }
            }
        }
        
        let uvSourceCanvas = new OffscreenCanvas(uvSource.width, uvSource.height);
        let uvSourceCtx = uvSourceCanvas.getContext("2d");
        uvSourceCtx.drawImage(uvSource, 0, 0);
        
        let prerenderCanvas = new OffscreenCanvas(uvSource.width, uvSource.height);
        let prerenderCtx = prerenderCanvas.getContext("2d");

        let uvSourceData = uvSourceCtx.getImageData(0, 0, uvSource.width, uvSource.height).data;
        for (let y = 0; y < uvSource.height; y++) {
            for (let x = 0; x < uvSource.width; x++) {
                let color = colorMap.get(uvSourceData.subarray((x + y * uvSource.width) * 4, (x + y * uvSource.width) * 4 + 4).toString());
                if (color != null) {
                    prerenderCtx.fillStyle = "rgb(" + color[0] + ", " + color[1] + ", " + color[2] + ", " + color[3] / 255 + ")";
                    prerenderCtx.fillRect(x, y, 1, 1);
                }
            }
        }
        if (colorLookup != null) {
            Rig.prerenderCache.set(colorLookup, prerenderCanvas);
        }
        else {
            Rig.prerenderCache.set(hashedArray, prerenderCanvas);
        }
        return prerenderCanvas;
    }
}

export { Rig, Controls, UVImage };