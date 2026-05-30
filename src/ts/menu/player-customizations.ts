import { socket } from "../../index.js";
import { clientPlayer } from "../entity/client-player.js";
import { Rig } from "../entity/rig.js";
import { images } from "../game/loader.js";

const playerCustomizationCanvas: HTMLCanvasElement = document.getElementById("playerCustomizationCanvas") as HTMLCanvasElement;
const playerCustomizationCtx = playerCustomizationCanvas.getContext("2d") as CanvasRenderingContext2D;

playerCustomizationCanvas.width = 16 * 4;
playerCustomizationCanvas.height = 32 * 4;
playerCustomizationCtx.imageSmoothingEnabled = false;

function rgbToHex(color: number[]) {
    return "#" + (1 << 24 | color[0] << 16 | color[1] << 8 | color[2]).toString(16).slice(1);
};
function hexToRgb(color: string) {
    return [Number.parseInt(color.substring(1, 3), 16), Number.parseInt(color.substring(3, 5), 16), Number.parseInt(color.substring(5, 7), 16)];
};

function updatePlayerCustomizations() {
    // (document.getElementById("playerBodyInput") as HTMLInputElement).value = rgbToHex(clientPlayer.customizations.body);
    // (document.getElementById("playerBodyAInput") as HTMLInputElement).value = clientPlayer.customizations.body[3].toString();
    // (document.getElementById("playerShirtInput") as HTMLInputElement).value = rgbToHex(clientPlayer.customizations.shirt);
    // (document.getElementById("playerShirtAInput") as HTMLInputElement).value = clientPlayer.customizations.shirt[3].toString();
    // (document.getElementById("playerPantsInput") as HTMLInputElement).value = rgbToHex(clientPlayer.customizations.pants);
    // (document.getElementById("playerPantsAInput") as HTMLInputElement).value = clientPlayer.customizations.pants[3].toString();
    // (document.getElementById("playerPantsTypeInput") as HTMLSelectElement).value = clientPlayer.customizations.pantsType;
    // (document.getElementById("playerHairInput") as HTMLInputElement).value = rgbToHex(clientPlayer.customizations.hair);
    // (document.getElementById("playerHairAInput") as HTMLInputElement).value = clientPlayer.customizations.hair[3].toString();
    // (document.getElementById("playerHairTypeInput") as HTMLSelectElement).value = clientPlayer.customizations.hairType;
    drawPlayerCustomizations();
};
function drawPlayerCustomizations() {
    // let image = Rig.prerender(images.get(clientPlayer.image.uvLookup), images.get(clientPlayer.image.uvSource), null, images.get(clientPlayer.image.colorLookup));
    // playerCustomizationCtx.clearRect(0, 0, playerCustomizationCanvas.width, playerCustomizationCanvas.height);
    // playerCustomizationCtx.save();
    // playerCustomizationCtx.scale(4, 4);
    // playerCustomizationCtx.translate(8, 16);
    // Rig.drawPlayer(playerCustomizationCtx, image, 0, false);
    // playerCustomizationCtx.restore();
};
function sendPlayerCustomizations() {
    // socket.emit("customizations", clientPlayer.customizations);
};

// document.getElementById("playerBodyInput").oninput = () => {
//     let color = hexToRgb((document.getElementById("playerBodyInput") as HTMLInputElement).value);
//     clientPlayer.customizations.body[0] = color[0];
//     clientPlayer.customizations.body[1] = color[1];
//     clientPlayer.customizations.body[2] = color[2];
//     drawPlayerCustomizations();
//     sendPlayerCustomizations();
// };
// document.getElementById("playerBodyAInput").oninput = () => {
//     clientPlayer.customizations.body[3] = Number((document.getElementById("playerBodyAInput") as HTMLInputElement).value);
//     drawPlayerCustomizations();
//     sendPlayerCustomizations();
// };
// document.getElementById("playerShirtInput").oninput = () => {
//     let color = hexToRgb((document.getElementById("playerShirtInput") as HTMLInputElement).value);
//     clientPlayer.customizations.shirt[0] = color[0];
//     clientPlayer.customizations.shirt[1] = color[1];
//     clientPlayer.customizations.shirt[2] = color[2];
//     drawPlayerCustomizations();
//     sendPlayerCustomizations();
// };
// document.getElementById("playerShirtAInput").oninput = () => {
//     clientPlayer.customizations.shirt[3] = Number((document.getElementById("playerShirtAInput") as HTMLInputElement).value);
//     drawPlayerCustomizations();
//     sendPlayerCustomizations();
// };
// document.getElementById("playerPantsInput").oninput = () => {
//     let color = hexToRgb((document.getElementById("playerPantsInput") as HTMLInputElement).value);
//     clientPlayer.customizations.pants[0] = color[0];
//     clientPlayer.customizations.pants[1] = color[1];
//     clientPlayer.customizations.pants[2] = color[2];
//     drawPlayerCustomizations();
//     sendPlayerCustomizations();
// };
// document.getElementById("playerPantsAInput").oninput = () => {
//     clientPlayer.customizations.pants[3] = Number((document.getElementById("playerPantsAInput") as HTMLInputElement).value);
//     drawPlayerCustomizations();
//     sendPlayerCustomizations();
// };
// document.getElementById("playerPantsTypeInput").oninput = () => {
//     clientPlayer.customizations.pantsType = (document.getElementById("playerPantsTypeInput") as HTMLSelectElement).value;
//     drawPlayerCustomizations();
//     sendPlayerCustomizations();
// };
// document.getElementById("playerHairInput").oninput = () => {
//     let color = hexToRgb((document.getElementById("playerHairInput") as HTMLInputElement).value);
//     clientPlayer.customizations.hair[0] = color[0];
//     clientPlayer.customizations.hair[1] = color[1];
//     clientPlayer.customizations.hair[2] = color[2];
//     drawPlayerCustomizations();
//     sendPlayerCustomizations();
// };
// document.getElementById("playerHairAInput").oninput = () => {
//     clientPlayer.customizations.hair[3] = Number((document.getElementById("playerHairAInput") as HTMLInputElement).value);
//     drawPlayerCustomizations();
//     sendPlayerCustomizations();
// };
// document.getElementById("playerHairTypeInput").oninput = () => {
//     clientPlayer.customizations.hairType = (document.getElementById("playerHairTypeInput") as HTMLSelectElement).value;
//     drawPlayerCustomizations();
//     sendPlayerCustomizations();
// };

export { updatePlayerCustomizations };