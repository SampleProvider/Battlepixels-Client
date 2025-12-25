import { createNoise3D } from "simplex-noise";
import { socket } from "../../index.js";
import { clientPlayer } from "../entity/client-player.js";
import { Rig } from "../entity/rig.js";
import { images } from "../game/loader.js";

const playerCustomizationsCanvas: HTMLCanvasElement = document.getElementById("playerCustomizationsCanvas") as HTMLCanvasElement;
const playerCustomizationsCtx = playerCustomizationsCanvas.getContext("2d") as CanvasRenderingContext2D;

playerCustomizationsCanvas.width = 16 * 4;
playerCustomizationsCanvas.height = 32 * 4;
playerCustomizationsCtx.imageSmoothingEnabled = false;

function rgbToHex(color: number[]) {
    return "#" + (1 << 24 | color[0] << 16 | color[1] << 8 | color[2]).toString(16).slice(1);
};
function hexToRgb(color: string) {
    return [Number.parseInt(color.substring(1, 3), 16), Number.parseInt(color.substring(3, 5), 16), Number.parseInt(color.substring(5, 7), 16)];
};

function updatePlayerCustomizations() {
    (document.getElementById("playerBodyInput") as HTMLInputElement).value = rgbToHex(clientPlayer.customizations.body);
    (document.getElementById("playerBodyAInput") as HTMLInputElement).value = clientPlayer.customizations.body[3].toString();
    (document.getElementById("playerShirtInput") as HTMLInputElement).value = rgbToHex(clientPlayer.customizations.shirt);
    (document.getElementById("playerShirtAInput") as HTMLInputElement).value = clientPlayer.customizations.shirt[3].toString();
    (document.getElementById("playerPantsInput") as HTMLInputElement).value = rgbToHex(clientPlayer.customizations.pants);
    (document.getElementById("playerPantsAInput") as HTMLInputElement).value = clientPlayer.customizations.pants[3].toString();
    (document.getElementById("playerPantsTypeInput") as HTMLSelectElement).value = clientPlayer.customizations.pantsType;
    (document.getElementById("playerHairInput") as HTMLInputElement).value = rgbToHex(clientPlayer.customizations.hair);
    (document.getElementById("playerHairAInput") as HTMLInputElement).value = clientPlayer.customizations.hair[3].toString();
    (document.getElementById("playerHairTypeInput") as HTMLSelectElement).value = clientPlayer.customizations.hairType;
    drawPlayerCustomizations();
};
function drawPlayerCustomizations() {
    let prerenderCanvas = new OffscreenCanvas(images.get("player").width, images.get("player").height);
    let prerenderCtx = prerenderCanvas.getContext("2d");
    Rig.prerender(prerenderCtx, clientPlayer.customizations);
    playerCustomizationsCtx.fillStyle = "#a6fcdb";
    playerCustomizationsCtx.fillRect(0, 0, playerCustomizationsCanvas.width, playerCustomizationsCanvas.height);
    playerCustomizationsCtx.save();
    playerCustomizationsCtx.scale(4, 4);
    playerCustomizationsCtx.translate(8, 16);
    Rig.drawPlayer(playerCustomizationsCtx, prerenderCanvas, clientPlayer.customizations, 0, false);
    playerCustomizationsCtx.restore();
};
function sendPlayerCustomizations() {
    socket.emit("customizations", clientPlayer.customizations);
};

document.getElementById("playerBodyInput").oninput = () => {
    let color = hexToRgb((document.getElementById("playerBodyInput") as HTMLInputElement).value);
    clientPlayer.customizations.body[0] = color[0];
    clientPlayer.customizations.body[1] = color[1];
    clientPlayer.customizations.body[2] = color[2];
    drawPlayerCustomizations();
    sendPlayerCustomizations();
};
document.getElementById("playerBodyAInput").oninput = () => {
    clientPlayer.customizations.body[3] = Number((document.getElementById("playerBodyAInput") as HTMLInputElement).value);
    drawPlayerCustomizations();
    sendPlayerCustomizations();
};
document.getElementById("playerShirtInput").oninput = () => {
    let color = hexToRgb((document.getElementById("playerShirtInput") as HTMLInputElement).value);
    clientPlayer.customizations.shirt[0] = color[0];
    clientPlayer.customizations.shirt[1] = color[1];
    clientPlayer.customizations.shirt[2] = color[2];
    drawPlayerCustomizations();
    sendPlayerCustomizations();
};
document.getElementById("playerShirtAInput").oninput = () => {
    clientPlayer.customizations.shirt[3] = Number((document.getElementById("playerShirtAInput") as HTMLInputElement).value);
    drawPlayerCustomizations();
    sendPlayerCustomizations();
};
document.getElementById("playerPantsInput").oninput = () => {
    let color = hexToRgb((document.getElementById("playerPantsInput") as HTMLInputElement).value);
    clientPlayer.customizations.pants[0] = color[0];
    clientPlayer.customizations.pants[1] = color[1];
    clientPlayer.customizations.pants[2] = color[2];
    drawPlayerCustomizations();
    sendPlayerCustomizations();
};
document.getElementById("playerPantsAInput").oninput = () => {
    clientPlayer.customizations.pants[3] = Number((document.getElementById("playerPantsAInput") as HTMLInputElement).value);
    drawPlayerCustomizations();
    sendPlayerCustomizations();
};
document.getElementById("playerPantsTypeInput").oninput = () => {
    clientPlayer.customizations.pantsType = (document.getElementById("playerPantsTypeInput") as HTMLSelectElement).value;
    drawPlayerCustomizations();
    sendPlayerCustomizations();
};
document.getElementById("playerHairInput").oninput = () => {
    let color = hexToRgb((document.getElementById("playerHairInput") as HTMLInputElement).value);
    clientPlayer.customizations.hair[0] = color[0];
    clientPlayer.customizations.hair[1] = color[1];
    clientPlayer.customizations.hair[2] = color[2];
    drawPlayerCustomizations();
    sendPlayerCustomizations();
};
document.getElementById("playerHairAInput").oninput = () => {
    clientPlayer.customizations.hair[3] = Number((document.getElementById("playerHairAInput") as HTMLInputElement).value);
    drawPlayerCustomizations();
    sendPlayerCustomizations();
};
document.getElementById("playerHairTypeInput").oninput = () => {
    clientPlayer.customizations.hairType = (document.getElementById("playerHairTypeInput") as HTMLSelectElement).value;
    drawPlayerCustomizations();
    sendPlayerCustomizations();
};

const customizationsCanvas: HTMLCanvasElement = document.getElementById("customizationsCanvas") as HTMLCanvasElement;
const customizationsCtx = customizationsCanvas.getContext("2d") as CanvasRenderingContext2D;

function onResize() {
    customizationsCanvas.width = window.innerWidth * devicePixelRatio;
    customizationsCanvas.height = window.innerHeight * devicePixelRatio;
    customizationsCtx.imageSmoothingEnabled = false;
};
window.addEventListener("resize", () => {
    onResize();
});
onResize();

let customizationsContainer = document.getElementById("customizationsContainer");

let noise3D = createNoise3D();

function updateCustomizationsFrame() {
    if (customizationsContainer.style.display == "none") {
        window.requestAnimationFrame(updateCustomizationsFrame);
        return;
    }

    let time = performance.now();

    let size = 64;

    let offsetX = -time / 100;
    let offsetY = time / 100;

    for (let y = Math.floor(-offsetY / size); y < (customizationsCanvas.height - offsetY) / size; y++) {
        for (let x = Math.floor(-offsetX / size); x < (customizationsCanvas.width - offsetX) / size; x++) {
            let noise = noise3D(x, y, time / 1000);
            let color = 230 - noise * 25;
            customizationsCtx.fillStyle = "rgb(" + color + ", " + color + ", " + color + ")";
            // menuCtx.fillStyle = "rgb(" + x * 50 + ", " + y * 50 + ", " + 255 + ")";
            customizationsCtx.fillRect(x * size + offsetX, y * size + offsetY, size, size);
        }
    }

    window.requestAnimationFrame(updateCustomizationsFrame);
};
window.requestAnimationFrame(updateCustomizationsFrame);

export { updatePlayerCustomizations };