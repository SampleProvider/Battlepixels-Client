import { clientPlayer } from "../entity/client-player.js";
import { selectWeapon } from "../ui/hud.js";
import { draggableWindow } from "../ui/window.js";
import { cinematicCameraEnabled } from "./camera.js";

let keys = new Map<string, boolean>();
let keybinds = {
    left: "A",
    right: "D",
    up: "W",
    down: "S",
    attack: "LMB",
    reload: "R",
    hotbar1: "1",
    hotbar2: "2",
    hotbar3: "3",
    hotbar4: "4",
    hotbar5: "5",
    hotbar6: "6",
};

let mouseX = 0;
let mouseY = 0;

let keyboardLayoutMap = await (navigator as any).keyboard?.getLayoutMap();
document.onkeydown = (e) => {
    let key = e.key;
    if (keyboardLayoutMap != null) {
        key = keyboardLayoutMap.get(e.code);
    }
    if (key == null) {
        key = e.code;
    }
    if (key.length == 1) {
        key = key.toUpperCase();
    }
    // keys.set(key, performance.now());
    keys.set(key, true);
    if (clientPlayer.id != null) {
        let weaponKeys = [keybinds.hotbar1, keybinds.hotbar2, keybinds.hotbar3, keybinds.hotbar4, keybinds.hotbar5, keybinds.hotbar6];
        for (let i = 0; i < clientPlayer.weapons.length; i++) {
            if (key == weaponKeys[i]) {
                selectWeapon(i);
            }
        }
        if (key == "`") {
            selectWeapon(-1);
        }
    }
    if (key == "E" && !cinematicCameraEnabled) {
        draggableWindow.toggle();
    }
    // if (key == "Escape") {
    //     if (!paused) {
    //         pauseGame();
    //     }
    // }
};
document.onkeyup = (e) => {
    let key = e.key;
    if (keyboardLayoutMap != null) {
        key = keyboardLayoutMap.get(e.code);
    }
    if (key == null) {
        key = e.code;
    }
    if (key.length == 1) {
        key = key.toUpperCase();
    }
    keys.set(key, false);
};

document.getElementById("canvas").onmousedown = (e) => {
    let key: string | null = null;
    if (e.button == 0) {
        key = "LMB";
    }
    else if (e.button == 1) {
        key = "MMB";
    }
    else if (e.button == 2) {
        key = "RMB";
    }
    if (key != null) {
        keys.set(key, true);
    }
};
document.onmouseup = (e) => {
    let key: string | null = null;
    if (e.button == 0) {
        key = "LMB";
    }
    else if (e.button == 1) {
        key = "MMB";
    }
    else if (e.button == 2) {
        key = "RMB";
    }
    if (key != null) {
        keys.set(key, false);
    }
};
document.getElementById("canvas").oncontextmenu = (e) => {
    e.preventDefault();
};

document.onmousemove = (e) => {
    mouseX = e.clientX * devicePixelRatio;
    mouseY = e.clientY * devicePixelRatio;
};

document.getElementById("canvas").onwheel = (e) => {
    if (clientPlayer.id != null) {
        if (clientPlayer.controls.weapon == -1) {
            if (e.deltaY > 0) {
                selectWeapon(0);
            }
            else {
                selectWeapon(clientPlayer.weapons.length - 1);
            }
        }
        else {
            selectWeapon((clientPlayer.controls.weapon + Math.sign(e.deltaY) + clientPlayer.weapons.length) % clientPlayer.weapons.length);
        }
    }
};

export { keys, keybinds, mouseX, mouseY };