import { clientPlayer } from "../entity/client-player.js";

let keys = new Map<string, boolean>();

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
        let weaponKeys = ["1", "2", "3", "4", "5"];
        for (let i = 0; i < clientPlayer.weapons.length; i++) {
            if (key == weaponKeys[i]) {
                clientPlayer.controls.weapon = i;
            }
        }
    }
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
        key = "Left Mouse Button";
    }
    else if (e.button == 1) {
        key = "Middle Mouse Button";
    }
    else if (e.button == 2) {
        key = "Right Mouse Button";
    }
    if (key != null) {
        keys.set(key, true);
    }
};
document.onmouseup = (e) => {
    let key: string | null = null;
    if (e.button == 0) {
        key = "Left Mouse Button";
    }
    else if (e.button == 1) {
        key = "Middle Mouse Button";
    }
    else if (e.button == 2) {
        key = "Right Mouse Button";
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
        clientPlayer.controls.weapon = (clientPlayer.controls.weapon + Math.sign(e.deltaY) + clientPlayer.weapons.length) % clientPlayer.weapons.length;
    }
};

export { keys, mouseX, mouseY };