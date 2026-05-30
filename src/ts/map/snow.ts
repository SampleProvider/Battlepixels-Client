import { clientPlayer } from "../entity/client-player.js";
import { cameraScale, cameraX, cameraY } from "../game/camera.js";
import { BackgroundEntity } from "./background-entity.js";
import { StaticMap } from "./map.js";
import { currentWeather } from "./weather.js";

let canvas = document.getElementById("canvas") as HTMLCanvasElement;

class BackgroundSnowParticle extends BackgroundEntity {
    rotation: number;
    speedRotation: number;

    size: number;

    constructor(x: number, y: number, parallaxFactor: number) {
        super(x, y, 1e-10, 1e-10, parallaxFactor);

        this.speedX = currentWeather.windSpeedX * (1 - this.parallaxFactor);
        this.speedY = currentWeather.windSpeedY * (1 - this.parallaxFactor);

        this.rotation = Math.random() * Math.PI * 2;
        this.speedRotation = (Math.random() * 2 - 1) * 10 * Math.PI / 180;

        this.size = (Math.random() * 2 + 2) * (1 - this.parallaxFactor);
    }
    update(frameTime: number) {
        this.speedX += (currentWeather.windSpeedX * (1 - this.parallaxFactor) - this.speedX) * 0.1;
        this.speedY += (currentWeather.windSpeedY * (1 - this.parallaxFactor) - this.speedY) * 0.1;
        super.update(frameTime);
        this.rotation += this.speedRotation * frameTime;
        this.speedRotation *= 0.95;

        let buffer = 4 * Math.sqrt(2);
        let targetX = canvas.width / cameraScale / 2 - StaticMap.list.get(clientPlayer.map).width * 8 / 2;
        let targetY = canvas.height / cameraScale / 2 - StaticMap.list.get(clientPlayer.map).height * 8 / 2;
        if (this.x + buffer < -((targetX - cameraX) * this.parallaxFactor + cameraX) || this.x - buffer > -((targetX - cameraX) * this.parallaxFactor + cameraX) + canvas.width / cameraScale || this.y + buffer < -((targetY - cameraY) * this.parallaxFactor + cameraY) || this.y - buffer > -((targetY - cameraY) * this.parallaxFactor + cameraY) + canvas.height / cameraScale) {
            this.remove();
            return;
        }
        // let diagonal = this.size * Math.sqrt(2);
        // if (this.x < -diagonal / 2 || this.x > StaticMap.list.get(clientPlayer.map).width * 8 + diagonal / 2 || this.y > StaticMap.list.get(clientPlayer.map).height * 8 + diagonal / 2) {
        // // if (this.x <= 0 || this.x >= StaticMap.list.get(clientPlayer.map).width * 8 || this.y >= StaticMap.list.get(clientPlayer.map).height * 8) {
        //     this.remove();
        //     return;
        // }
    }
    draw(belowCtx: OffscreenCanvasRenderingContext2D) {
        belowCtx.fillStyle = "#ffffff77";
        let scale = 1;
        belowCtx.globalAlpha = scale;
        belowCtx.save();
        belowCtx.translate(this.x, this.y);
        belowCtx.rotate(this.rotation);
        belowCtx.fillRect(-this.size / 2 * scale, -this.size / 2 * scale, this.size * scale, this.size * scale);
        belowCtx.restore();
        belowCtx.globalAlpha = 1;
    }
}

export { BackgroundSnowParticle };