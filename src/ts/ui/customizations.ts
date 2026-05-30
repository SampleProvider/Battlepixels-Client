import { socket } from "../../index.js";
import { clientPlayer } from "../entity/client-player.js";
import { Player } from "../entity/player.js";
import { images } from "../game/loader.js";

const customizeCanvas: HTMLCanvasElement = document.getElementById("customizeCanvas") as HTMLCanvasElement;
const customizeCtx = customizeCanvas.getContext("2d") as CanvasRenderingContext2D;

let image: OffscreenCanvas = null;
let imageOffsetX = 0;
let imageOffsetY = -5;
let imageWidth = 15;
let imageHeight = 30;
customizeCanvas.width = imageWidth * 4;
customizeCanvas.height = imageHeight * 4;
customizeCtx.imageSmoothingEnabled = false;

function drawCustomizations() {
    customizeCtx.clearRect(0, 0, customizeCanvas.width, customizeCanvas.height);
    customizeCtx.save();
    customizeCtx.scale(4, 4);
    customizeCtx.translate(imageWidth / 2, imageHeight / 2);
    for (let i = 0; i < image.height / imageHeight; i++) {
        if (i >= 1 && i < 8 && i != 1) {
            continue;
        }
        if (i >= 10 && i < 17 && i != 10) {
            continue;
        }
        customizeCtx.drawImage(image, Math.floor(clientPlayer.animationFrame) * imageWidth, i * imageHeight, imageWidth, imageHeight, imageOffsetX - imageWidth / 2, imageOffsetY - imageHeight / 2, imageWidth, imageHeight);
    }
    customizeCtx.restore();
};
async function prerenderCustomizations() {
    if (typeof clientPlayer.colorLookup == "string") {
        image = await Player.prerender(images.get("player_uv_lookup"), images.get("player_uv_source"), images.get(clientPlayer.colorLookup), null);
    }
    else {
        image = await Player.prerender(images.get("player_uv_lookup"), images.get("player_uv_source"), null, clientPlayer.colorLookup);
    }
};

document.getElementById("customizeButton").onclick = () => {
    let input = document.createElement("input");
    input.type = "file";
    input.accept = ".png";
    input.oninput = () => {
        let files = input.files;
        if (files.length == 0) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            let image = document.createElement("img");
            image.src = reader.result as "string";
            image.onload = () => {
                let canvas = document.createElement("canvas");
                let ctx = canvas.getContext("2d");
                canvas.width = image.width;
                canvas.height = image.height;
                ctx.drawImage(image, 0, 0);
                socket.emit("customizations", new Uint8ClampedArray(ctx.getImageData(0, 0, canvas.width, canvas.height).data));
            };
        };
        reader.readAsDataURL(files[0]);
    };
    input.click();
};

export { drawCustomizations, prerenderCustomizations };