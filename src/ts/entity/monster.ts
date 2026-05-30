import { serverIp } from "../../index.js";
import { images } from "../game/loader.js";
import { Collision } from "../map/map.js";
import { EntityType } from "./entity.js";
import { Rig, Controls, UVImage } from "./rig.js";

interface MonsterData {
    name: string,
    image: string | UVImage,
    imageWidth: number,
    imageHeight: number,
    imageOffsetX: number,
    imageOffsetY: number,
    width: number,
    height: number,
    animations: Animation[],
    animationSpeed: number,
    hp: number,
}

class Monster extends Rig {
    type = EntityType.Monster;
    monsterType: string;

    static data: {
        [key: string]: MonsterData,
    };

    constructor(id: number, x: number, y: number, width: number, height: number, phantomFrames: number, dashTime: number, controls: Controls, collision: Collision, animationFrame: number, animationRotation: number, hp: number, hpMax: number, drawHp: boolean, name: string, drawName: boolean, monsterType: string) {
        super(id, x, y, width, height, phantomFrames, dashTime, controls, collision, Monster.data[monsterType].image, Monster.data[monsterType].imageWidth, Monster.data[monsterType].imageHeight, Monster.data[monsterType].imageOffsetX, Monster.data[monsterType].imageOffsetY, animationFrame, animationRotation, hp, hpMax, drawHp, name, drawName);
        this.monsterType = monsterType;
    }

    static async load() {
        Monster.data = await (await fetch(serverIp + "assets/monsters.json")).json();
        for (let i in Monster.data) {
            if (typeof Monster.data[i].image == "string") {
                let image = new Image();
                image.src = "/src/img/" + Monster.data[i].image;
                images.set(Monster.data[i].image, image);
            }
            else if (typeof Monster.data[i].image.colorLookup == "string") {
                let image = new Image();
                image.src = "/src/img/" + Monster.data[i].image.colorLookup;
                images.set(Monster.data[i].image.colorLookup, image);
            }
        }
    }
}

export { Monster };