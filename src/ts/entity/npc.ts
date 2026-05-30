import { serverIp } from "../../index.js";
import { EntityType } from "./entity.js";
import { Collision } from "../map/map.js";
import { Rig, Controls, UVImage } from "./rig.js";
import { images } from "../game/loader.js";

interface NpcData {
    name: string,
    image: string | UVImage,
    imageWidth: number,
    imageHeight: number,
    imageOffsetX: number,
    imageOffsetY: number,
    width: number,
    height: number,
}

class Npc extends Rig {
    type = EntityType.Npc;
    npcType: string;

    static data: {
        [key: string]: NpcData,
    };

    constructor(id: number, x: number, y: number, width: number, height: number, phantomFrames: number, dashTime: number, controls: Controls, collision: Collision, animationFrame: number, animationRotation: number, hp: number, hpMax: number, drawHp: boolean, name: string, drawName: boolean, npcType: string) {
        super(id, x, y, width, height, phantomFrames, dashTime, controls, collision, Npc.data[npcType].image, Npc.data[npcType].imageWidth, Npc.data[npcType].imageHeight, Npc.data[npcType].imageOffsetX, Npc.data[npcType].imageOffsetY, animationFrame, animationRotation, hp, hpMax, drawHp, name, drawName);
        this.npcType = npcType;
    }
    drawImage(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
        let armFrame = 0;
        for (let i = 0; i < this.image.height / this.imageHeight; i++) {
            if (typeof Npc.data[this.npcType].image != "string" && (Npc.data[this.npcType].image as UVImage).uvSource == "player_uv_source") {
                if (i >= 1 && i < 8 && i != 1 + armFrame) {
                    continue;
                }
                if (i >= 10 && i < 17 && i != 10 + armFrame) {
                    continue;
                }
            }
            ctx.drawImage(this.image, Math.floor(this.animationFrame) * this.imageWidth, i * this.imageHeight, this.imageWidth, this.imageHeight, this.imageOffsetX - this.imageWidth / 2, this.imageOffsetY - this.imageHeight / 2, this.imageWidth, this.imageHeight);
        }
    }

    static async load() {
        Npc.data = await (await fetch(serverIp + "assets/npcs.json")).json();
        for (let i in Npc.data) {
            if (typeof Npc.data[i].image == "string") {
                let image = new Image();
                image.src = "/src/img/" + Npc.data[i].image;
                images.set(Npc.data[i].image, image);
            }
            else if (typeof Npc.data[i].image.colorLookup == "string") {
                let image = new Image();
                image.src = "/src/img/" + Npc.data[i].image.colorLookup;
                images.set(Npc.data[i].image.colorLookup, image);
            }
        }
    }
}

export { Npc };