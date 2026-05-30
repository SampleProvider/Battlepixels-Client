import { clientPlayer } from "../entity/client-player.js";
import { BackgroundSnowParticle } from "./snow.js";
import { Particle, SnowParticle } from "../entity/particle.js";
import { BackgroundEntity } from "./background-entity.js";
import { Cloud } from "./cloud.js";
import { StaticMap } from "./map.js";
import { cameraScale, cameraX, cameraY } from "../game/camera.js";

let currentWeather = {
    cloudDensity: 0.0001,
    snowDensity: 0.005,
    // windSpeedX: -2,
    // windSpeedY: 1,
    windSpeedX: 0.1,
    windSpeedY: 0.1,
};

function initWeather() {
    let map = StaticMap.list.get(clientPlayer.map);
    let area = map.width * 8 * map.height * 8;
    let clouds = currentWeather.cloudDensity * area;
    while (Math.random() < clouds) {
        clouds -= 1;
        new Cloud(Math.random() * map.width * 8, Math.random() * map.height * 8);
    }
    let time = map.height * 8 / currentWeather.windSpeedY;
    // for (let i = 0; i < time; i++) {
    //     spawnSnowParticles(1);
    //     for (let [_, particle] of Particle.list) {
    //         if (particle instanceof SnowParticle) {
    //             particle.update(1);
    //         }
    //     }
    // }
    initBackgroundSnowParticles();
};
function updateWeather(frameTime: number) {
    let map = StaticMap.list.get(clientPlayer.map);
    let area = Math.abs(currentWeather.windSpeedX) * frameTime * map.height * 8;
    let clouds = currentWeather.cloudDensity * area;
    while (Math.random() < clouds) {
        clouds -= 1;
        if (currentWeather.windSpeedX < 0) {
            new Cloud(map.width * 8 + 32 * 8, Math.random() * map.height * 8);
        }
        else {
            new Cloud(-32 * 8, Math.random() * map.height * 8);
        }
    }
    spawnSnowParticles(frameTime);
    updateBackgroundSnowParticles(frameTime);
};

function spawnSnowParticles(frameTime: number) {
    let map = StaticMap.list.get(clientPlayer.map);
    let area = currentWeather.windSpeedY * frameTime * map.width * 8 + Math.abs(currentWeather.windSpeedX) * frameTime * map.height * 8;
    let particles = currentWeather.snowDensity * area * 0.1;
    while (Math.random() < particles) {
        particles -= 1;
        if (Math.random() < currentWeather.windSpeedY * frameTime * map.width * 8 / area) {
            new SnowParticle(Math.random() * map.width * 8, 0);
        }
        else {
            if (currentWeather.windSpeedX < 0) {
                new SnowParticle(map.width * 8, Math.random() * map.height * 8);
            }
            else {
                new SnowParticle(0, Math.random() * map.height * 8);
            }
        }
    }
};

let snowBuffer = 4 * Math.sqrt(2) / 2;

let lastCameraX = cameraX;
let lastCameraY = cameraY;
let lastCameraScale = cameraScale;

let canvas = document.getElementById("canvas") as HTMLCanvasElement;

let lastCanvasWidth = canvas.width / cameraScale;
let lastCanvasHeight = canvas.height / cameraScale;
function initBackgroundSnowParticles() {
    let map = StaticMap.list.get(clientPlayer.map);
    lastCameraX = cameraX;
    lastCameraY = cameraY;
    lastCameraScale = cameraScale;
    lastCanvasWidth = canvas.width / cameraScale;
    lastCanvasHeight = canvas.height / cameraScale;
    let minParallax = 0.1;
    let maxParallax = 0.5;
    let targetX = canvas.width / cameraScale / 2 - map.width * 8 / 2;
    let targetY = canvas.height / cameraScale / 2 - map.height * 8 / 2;
    function parallaxCameraX(x: number, parallaxFactor: number) {
        return x - (targetX - cameraX) * parallaxFactor;
    };
    function parallaxCameraY(y: number, parallaxFactor: number) {
        return y - (targetY - cameraY) * parallaxFactor;
    };
    // let minLeft = -parallaxCameraX(cameraX, minParallax);
    // let minLastLeft = -parallaxCameraX(lastCameraX + currentWeather.windSpeedX * (1 - minParallax), minParallax);

    let left = -cameraX - snowBuffer;
    let right = -cameraX + canvas.width / cameraScale + snowBuffer;
    let top = -cameraY - snowBuffer;
    let bottom = -cameraY + canvas.height / cameraScale + snowBuffer;

    
    let particles = (right - left) * (bottom - top) * currentWeather.snowDensity;
    // let minParallaxParticles = particles / (1 - minParallax);
    // let maxParallaxParticles = particles / (1 - maxParallax);
    let totalParticles = particles * (Math.log(1 - minParallax) - Math.log(1 - maxParallax)) / (maxParallax - minParallax);
    while (Math.random() < totalParticles) {
        totalParticles -= 1;
        let parallaxFactor = 1 - Math.pow(Math.E, Math.log(1 - maxParallax) + Math.random() * (Math.log(1 - minParallax) - Math.log(1 - maxParallax)));
        // let parallaxFactor = minParallax + Math.random() * (maxParallax - minParallax);
        new BackgroundSnowParticle(parallaxCameraX(left + Math.random() * (right - left), parallaxFactor), parallaxCameraY(top + Math.random() * (bottom - top), parallaxFactor), parallaxFactor);
    }
};
function updateBackgroundSnowParticles(frameTime: number) {
    let map = StaticMap.list.get(clientPlayer.map);
    let minParallax = 0.1;
    let maxParallax = 0.5;
    let targetX = canvas.width / cameraScale / 2 - map.width * 8 / 2;
    let targetY = canvas.height / cameraScale / 2 - map.height * 8 / 2;
    function parallaxCameraX(x: number, parallaxFactor: number) {
        return x - (targetX - cameraX) * parallaxFactor;
    };
    function parallaxCameraY(y: number, parallaxFactor: number) {
        return y - (targetY - cameraY) * parallaxFactor;
    };

    let left = -cameraX - snowBuffer;
    let lastLeft = -lastCameraX - snowBuffer + currentWeather.windSpeedX * frameTime;
    let right = -cameraX + canvas.width / cameraScale + snowBuffer;
    let lastRight = -lastCameraX + lastCanvasWidth + snowBuffer + currentWeather.windSpeedX * frameTime;
    let top = -cameraY - snowBuffer;
    let lastTop = -lastCameraY - snowBuffer + currentWeather.windSpeedY * frameTime;
    let bottom = -cameraY + canvas.height / cameraScale + snowBuffer;
    let lastBottom = -lastCameraY + lastCanvasHeight + snowBuffer + currentWeather.windSpeedY * frameTime;

    let leftParticles = (lastLeft - left) * (bottom - top) * currentWeather.snowDensity;
    while (Math.random() < leftParticles) {
        leftParticles -= 1;
        let parallaxFactor = minParallax + Math.random() * (maxParallax - minParallax);
        new BackgroundSnowParticle(parallaxCameraX(left + Math.random() * (lastLeft - left) * (1 - parallaxFactor), parallaxFactor), parallaxCameraY(top + Math.random() * (bottom - top), parallaxFactor), parallaxFactor);
    }
    let rightParticles = (right - lastRight) * (bottom - top) * currentWeather.snowDensity;
    while (Math.random() < rightParticles) {
        rightParticles -= 1;
        let parallaxFactor = minParallax + Math.random() * (maxParallax - minParallax);
        new BackgroundSnowParticle(parallaxCameraX(right + Math.random() * (lastRight - right) * (1 - parallaxFactor), parallaxFactor), parallaxCameraY(top + Math.random() * (bottom - top), parallaxFactor), parallaxFactor);
    }

    let topParticles = (lastTop - top) * (right - left) * currentWeather.snowDensity;
    while (Math.random() < topParticles) {
        topParticles -= 1;
        let parallaxFactor = minParallax + Math.random() * (maxParallax - minParallax);
        new BackgroundSnowParticle(parallaxCameraX(left + Math.random() * (right - left), parallaxFactor), parallaxCameraY(top + Math.random() * (lastTop - top) * (1 - parallaxFactor), parallaxFactor), parallaxFactor);
    }
    let bottomParticles = (bottom - lastBottom) * (right - left) * currentWeather.snowDensity;
    while (Math.random() < bottomParticles) {
        bottomParticles -= 1;
        let parallaxFactor = minParallax + Math.random() * (maxParallax - minParallax);
        new BackgroundSnowParticle(parallaxCameraX(left + Math.random() * (right - left), parallaxFactor), parallaxCameraY(bottom + Math.random() * (lastBottom - bottom) * (1 - parallaxFactor), parallaxFactor), parallaxFactor);
    }
    lastCameraX = cameraX;
    lastCameraY = cameraY;
    lastCameraScale = cameraScale;
    lastCanvasWidth = canvas.width / cameraScale;
    lastCanvasHeight = canvas.height / cameraScale;
};

export { currentWeather, initWeather, updateWeather };