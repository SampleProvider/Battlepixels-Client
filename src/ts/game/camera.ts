import { Entity } from "../entity/entity.js";
import { clientPlayer } from "../entity/client-player.js";
import { StaticMap } from "../map/map.js";
import { keys } from "./controls.js";
import { socket } from "../../index.js";
import { draggableWindow } from "../ui/window.js";
// import { currentQuest } from "../ui/quest.js";

let canvas = document.getElementById("canvas") as HTMLCanvasElement;

let cameraX = 0;
let cameraY = 0;
let cameraScale = 6;

let cameraTargetX: number = null;
let cameraTargetY: number = null;
let cameraTargetScale: number = null;

let cameraZoom = 0;

function setCameraScale(scale: number) {
    cameraX -= canvas.width / cameraScale / 2;
    cameraY -= canvas.height / cameraScale / 2;
    cameraScale = scale;
    cameraX += canvas.width / cameraScale / 2;
    cameraY += canvas.height / cameraScale / 2;
};
function resetCamera() {
    console.log("reset " + Entity.list.get(clientPlayer.id));
    if (clientPlayer.map == "menu") {
        cameraX = 0;
        cameraY = 0;
        cameraScale = canvas.width / (StaticMap.list.get(clientPlayer.map).width * 8);
    }
    if (Entity.list.get(clientPlayer.id) == null) {
        return;
    }
    if (cameraTargetScale != null) {
        setCameraScale(cameraTargetScale);
    }
    else if (clientPlayer.hp == 0) {
        setCameraScale(18);
    }
    else {
        setCameraScale(6);
    }
    cameraX = canvas.width / cameraScale / 2 - Entity.list.get(clientPlayer.id).x;
    cameraY = canvas.height / cameraScale / 2 - Entity.list.get(clientPlayer.id).y;
    if (cameraTargetX != null) {
        cameraX = canvas.width / cameraScale / 2 - cameraTargetX;
    }
    if (cameraTargetY != null) {
        cameraY = canvas.height / cameraScale / 2 - cameraTargetY;
    }
    if (StaticMap.list.get(clientPlayer.map).width * 8 >= canvas.width / cameraScale) {
        if (cameraX > 0) {
            cameraX = 0;
        }
        if (cameraX < canvas.width / cameraScale - StaticMap.list.get(clientPlayer.map).width * 8) {
            cameraX = canvas.width / cameraScale - StaticMap.list.get(clientPlayer.map).width * 8;
        }
    }
    if (StaticMap.list.get(clientPlayer.map).height * 8 * cameraScale >= canvas.height) {
        if (cameraY > 0) {
            cameraY = 0;
        }
        if (cameraY < canvas.height / cameraScale - StaticMap.list.get(clientPlayer.map).height * 8) {
            cameraY = canvas.height / cameraScale - StaticMap.list.get(clientPlayer.map).height * 8;
        }
    }
    cameraX = Math.round(cameraX * 256) / 256;
    cameraY = Math.round(cameraY * 256) / 256;
};
function updateCamera() {
    // if (Entity.list.get(clientPlayer.id) == null) {
    if (clientPlayer.map == "menu") {
        cameraScale = canvas.width / (StaticMap.list.get(clientPlayer.map).width * 8);
        let targetY = canvas.height / cameraScale - StaticMap.list.get(clientPlayer.map).height * 8;
        cameraX = 0;
        cameraY = cameraY * 0.99 + targetY * 0.01;
        cameraX = Math.round(cameraX * 256) / 256;
        cameraY = Math.round(cameraY * 256) / 256;
        return;
    }
    if (cameraTargetScale != null) {
        setCameraScale(cameraScale * 0.9 + cameraTargetScale * 0.1);
    }
    else if (clientPlayer.hp == 0) {
        setCameraScale(cameraScale * 0.9 + 18 * 0.1);
    }
    else {
        setCameraScale(6);
    }
    if (Entity.list.get(clientPlayer.id) == null) {
        // let targetX = canvas.width / cameraScale / 2 - clientPlayer.x;
        // let targetY = canvas.height / cameraScale / 2 - clientPlayer.y;
        // // cameraX = canvas.width / cameraScale / 2 - Entity.list.get(clientPlayer.id).x;
        // // cameraY = canvas.height / cameraScale / 2 - Entity.list.get(clientPlayer.id).y;
        // cameraX = cameraX * 0.9 + targetX * 0.1;
        // cameraY = cameraY * 0.9 + targetY * 0.1;
        return;
    }
    cameraZoom += ((keys.get("Right Mouse Button") ? 1 : 0) - cameraZoom) * 0.1;
    let targetX = canvas.width / cameraScale / 2 - Entity.list.get(clientPlayer.id).x;
    let targetY = canvas.height / cameraScale / 2 - Entity.list.get(clientPlayer.id).y;
    // targetX += -clientPlayer.speedX * 50;
    // targetY += -clientPlayer.speedY * 50;
    // cameraX = canvas.width / cameraScale / 2 - Entity.list.get(clientPlayer.id).x;
    // cameraY = canvas.height / cameraScale / 2 - Entity.list.get(clientPlayer.id).y;
    targetX -= Math.cos(clientPlayer.controls.angle) * Math.min(canvas.width / 2, canvas.height / 2) / cameraScale * cameraZoom;
    targetY -= Math.sin(clientPlayer.controls.angle) * Math.min(canvas.width / 2, canvas.height / 2) / cameraScale * cameraZoom;

    if (cameraTargetX != null) {
        targetX = canvas.width / cameraScale / 2 - cameraTargetX;
    }
    if (cameraTargetY != null) {
        targetY = canvas.height / cameraScale / 2 - cameraTargetY;
    }

    cameraX = cameraX * 0.95 + targetX * 0.05;
    cameraY = cameraY * 0.95 + targetY * 0.05;
    // cameraX = targetX - (cameraX2 - targetX);
    // cameraY = targetY - (cameraY2 - targetY);
    // cameraX = cameraX * 0.9 + (targetX - (cameraX2 - targetX)) * 0.1;
    // cameraY = cameraY * 0.9 + (targetY - (cameraY2 - targetY)) * 0.1;
    // cameraX = targetX;
    // cameraY = targetY;
    if (StaticMap.list.get(clientPlayer.map).width * 8 >= canvas.width / cameraScale) {
        if (cameraX > 0) {
            cameraX = 0;
        }
        if (cameraX < canvas.width / cameraScale - StaticMap.list.get(clientPlayer.map).width * 8) {
            cameraX = canvas.width / cameraScale - StaticMap.list.get(clientPlayer.map).width * 8;
        }
    }
    if (StaticMap.list.get(clientPlayer.map).height * 8 * cameraScale >= canvas.height) {
        if (cameraY > 0) {
            cameraY = 0;
        }
        if (cameraY < canvas.height / cameraScale - StaticMap.list.get(clientPlayer.map).height * 8) {
            cameraY = canvas.height / cameraScale - StaticMap.list.get(clientPlayer.map).height * 8;
        }
    }
    cameraX = Math.round(cameraX * 256) / 256;
    cameraY = Math.round(cameraY * 256) / 256;
};
function updateCameraOnResize(newWidth: number, newHeight: number) {
    cameraX -= canvas.width / cameraScale / 2;
    cameraY -= canvas.height / cameraScale / 2;
    cameraX += newWidth / cameraScale / 2;
    cameraY += newHeight / cameraScale / 2;
}

let cinematicCameraEnabled = false;

socket.on("camera", (data) => {
    if (data.cinematicCameraEnabled != null) {
        cinematicCameraEnabled = data.cinematicCameraEnabled;
        if (cinematicCameraEnabled) {
            document.getElementById("chat").style.transition = "1500ms ease-in transform, opacity ease-in-out 500ms";
            document.getElementById("hud").style.transition = "1500ms ease-in transform, opacity ease-in-out 500ms";
            document.getElementById("chat").innerText;
            document.getElementById("chat").style.opacity = "0";
            document.getElementById("hud").style.opacity = "0";
            document.getElementById("chat").style.transform = "translateY(100%)";
            document.getElementById("hud").style.transform = "translateY(100%)";
            document.getElementById("cinematicCameraTop").style.transform = "translateY(0%)";
            document.getElementById("cinematicCameraBottom").style.transform = "translateY(0%)";
            document.getElementById("currentQuest").style.display = "none";
            draggableWindow.hide();
        }
        else {
            document.getElementById("chat").style.transition = "500ms ease-out transform, opacity ease-in-out 500ms";
            document.getElementById("hud").style.transition = "500ms ease-out transform, opacity ease-in-out 500ms";
            document.getElementById("chat").innerText;
            document.getElementById("chat").style.opacity = "1";
            document.getElementById("hud").style.opacity = "1";
            document.getElementById("chat").style.transform = "";
            document.getElementById("hud").style.transform = "";
            document.getElementById("cinematicCameraTop").style.transform = "";
            document.getElementById("cinematicCameraBottom").style.transform = "";
            // if (currentQuest != null) {
            //     document.getElementById("currentQuest").style.display = "revert-layer";
            // }
        }
    }
    cameraTargetX = data.x;
    cameraTargetY = data.y;
    cameraTargetScale = data.scale;
});

export { cameraX, cameraY, cameraScale, resetCamera, updateCamera, updateCameraOnResize, cinematicCameraEnabled };