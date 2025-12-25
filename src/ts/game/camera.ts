import { clientPlayer } from "../entity/client-player.js";
import { Entity } from "../entity/entity.js";
import { SimulatedMap } from "../map/map.js";
import { keys } from "./controls.js";

let canvas = document.getElementById("canvas") as HTMLCanvasElement;

let cameraX = 0;
let cameraY = 0;
let cameraScale = 4;
let cameraZoom = 0;

function updateCamera() {
    if (Entity.list.get(clientPlayer.id) == null) {
        return;
    }
    cameraZoom += ((keys.get("Right Mouse Button") ? 1 : 0) - cameraZoom) * 0.1;
    cameraX = canvas.width / cameraScale / 2 - Entity.list.get(clientPlayer.id).x;
    cameraY = canvas.height / cameraScale / 2 - Entity.list.get(clientPlayer.id).y;
    cameraX -= Math.cos(clientPlayer.controls.angle) * Math.min(canvas.width / 2, canvas.height / 2) / cameraScale * cameraZoom;
    cameraY -= Math.sin(clientPlayer.controls.angle) * Math.min(canvas.width / 2, canvas.height / 2) / cameraScale * cameraZoom;
    if (SimulatedMap.list.get(clientPlayer.map).width >= canvas.width / cameraScale) {
        if (cameraX > 0) {
            cameraX = 0;
        }
        if (cameraX < canvas.width / cameraScale - SimulatedMap.list.get(clientPlayer.map).width) {
            cameraX = canvas.width / cameraScale - SimulatedMap.list.get(clientPlayer.map).width;
        }
    }
    if (SimulatedMap.list.get(clientPlayer.map).height * cameraScale >= canvas.height) {
        if (cameraY > 0) {
            cameraY = 0;
        }
        if (cameraY < canvas.height / cameraScale - SimulatedMap.list.get(clientPlayer.map).height) {
            cameraY = canvas.height / cameraScale - SimulatedMap.list.get(clientPlayer.map).height;
        }
    }
};

export { cameraX, cameraY, cameraScale, updateCamera };