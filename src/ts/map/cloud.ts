import { clientPlayer } from "../entity/client-player.js";
import { images } from "../game/loader.js";
import { BackgroundEntity } from "./background-entity.js";
import { StaticMap } from "./map.js";
import { currentWeather } from "./weather.js";

class Cloud extends BackgroundEntity {
    image: string;
    static data: string[][] = [];

    constructor(x: number, y: number) {
        let type = 0;
        let weights = [0.2, 0.5, 0.3];
        let totalWeight = 0;
        for (let i = 0; i < weights.length; i++) {
            totalWeight += weights[i];
        }
        let random = Math.random();
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                type = i;
                break;
            }
        }
        let image = Cloud.data[type][Math.floor(Math.random() * Cloud.data[type].length)];
        let width = images.get(image).width * 8;
        let height = images.get(image).height * 8;
        let parallaxFactor = 0.4 + Math.random() * 0.2;
        super(x, y, width, height, parallaxFactor);
        this.speedX = currentWeather.windSpeedX * (1 - this.parallaxFactor);
        this.speedY = (Math.random() * 2 - 1) / 30;
        this.image = image;
    }

    update(frameTime: number) {
        this.speedX += (currentWeather.windSpeedX * (1 - this.parallaxFactor) - this.speedX) * 0.1;
        super.update(frameTime);
        if ((this.speedX <= 0 && this.x + this.width <= 0) || (this.speedX >= 0 && this.x - this.width >= StaticMap.list.get(clientPlayer.map).width * 8) || (this.speedY <= 0 && this.y + this.height <= 0) || (this.speedY >= 0 && this.y - this.height >= StaticMap.list.get(clientPlayer.map).height * 8)) {
            this.remove();
        }
    }
    draw(belowCtx: OffscreenCanvasRenderingContext2D) {
        belowCtx.globalAlpha = 0.5;
        belowCtx.drawImage(images.get(this.image), this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        belowCtx.globalAlpha = 1;
    }

    static spawnClouds(frameTime: number) {
        if (Math.random() < frameTime / 5) {
            new Cloud(-32 * 8, Math.random() * StaticMap.list.get(clientPlayer.map).height * 8);
        }
    }

    static async load() {
        Cloud.data = await (await fetch("/src/img/clouds/clouds.json")).json();
        for (let i in Cloud.data) {
            for (let j in Cloud.data[i]) {
                let image = new Image();
                image.src = "/src/img/clouds/" + Cloud.data[i][j];
                images.set(Cloud.data[i][j], image);
            }
        }
    }
}

export { Cloud };