import { serverTick, fps } from "../game/game.js";
import { clientPlayer } from "../entity/client-player.js";
import { WeaponItem } from "./item.js";
import { BackgroundEntity } from "../map/background-entity.js";
import { inventory } from "./inventory.js";

let fpsText = document.getElementById("fpsText");

let healthBarBackgroundContainer = document.getElementById("healthBarBackgroundContainer");
let healthBarTextOutline = document.getElementById("healthBarTextOutline");
let healthBarText = document.getElementById("healthBarText");
let ammoBarBackgroundContainer = document.getElementById("ammoBarBackgroundContainer");
let ammoBarTextOutline = document.getElementById("ammoBarTextOutline");
let ammoBarText = document.getElementById("ammoBarText");
let reloadBar = document.getElementById("reloadBar");
let reloadBarBackgroundContainer = document.getElementById("reloadBarBackgroundContainer");

class Graph {
    id = Math.random();

    x: number;
    y: number;
    width: number;
    height: number;

    xScale: number;
    yScale: number;

    values: number[] = [];

    ctx: OffscreenCanvasRenderingContext2D;
    gradient: CanvasGradient;

    static list = new Map<number, Graph>();

    constructor(x: number, y: number, width: number, height: number, xScale: number, yScale: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.xScale = xScale;
        this.yScale = yScale;

        Graph.list.set(this.id, this);
    }

    setCtx(ctx: OffscreenCanvasRenderingContext2D) {
        if (this.ctx == ctx) {
            return;
        }
        this.ctx = ctx;
        this.gradient = ctx.createLinearGradient(this.x, this.y + 1, this.x, this.y + this.height - 1);
        this.gradient.addColorStop(0, "#ff00ff");
        this.gradient.addColorStop(0.1, "#ff0000");
        this.gradient.addColorStop(0.25, "#ff0000");
        this.gradient.addColorStop(0.4, "#ffff00");
        this.gradient.addColorStop(0.7, "#00ff00");
        this.gradient.addColorStop(1, "#00ff00");
    }

    draw() {
        if (this.ctx == null) {
            return;
        }
        this.ctx.fillStyle = "#7f7f7f7f";
        this.ctx.fillRect(this.x, this.y, this.width, this.height);

        this.ctx.strokeStyle = this.gradient;
        this.ctx.lineJoin = "bevel";
        this.ctx.lineCap = "butt";
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.x, Math.max(this.y + 1, this.y + this.height - 1 - this.values[0] * this.yScale));
        for (let i = 1; i < this.values.length; i++) {
            this.ctx.lineTo(this.x + i * this.xScale, Math.max(this.y + 1, this.y + this.height - 1 - this.values[i] * this.yScale));
        }
        this.ctx.stroke();
    }
    update(value: number) {
        this.values.push(value);
        while (this.values.length > this.width) {
            this.values.shift();
        }
    }
}

let tickGraph = new Graph(4, 100, 300, 100, 1, 2);

function drawHud(ctx: OffscreenCanvasRenderingContext2D) {
    tickGraph.setCtx(ctx);
    tickGraph.draw();
    // let canvas = ctx.canvas;

    // ctx.fillStyle = "#444444";
    // ctx.strokeStyle = "#000000";
    // ctx.lineWidth = 8;
    // ctx.strokeRect(canvas.width / 2 - 200, canvas.height - 52, 400, 40);
    // ctx.fillRect(canvas.width / 2 - 200, canvas.height - 52, 400, 40);
    
    // // ctx.fillStyle = "#ff0000";
    // let healthGradient = ctx.createLinearGradient(canvas.width / 2 - 200, canvas.height - 52, canvas.width / 2 + 200, canvas.height - 52 + 40);
    // healthGradient.addColorStop(0, "black");
    // healthGradient.addColorStop(1, "#ff2200");
    // ctx.fillStyle = healthGradient;
    // ctx.fillRect(canvas.width / 2 - 200, canvas.height - 52, 400 * clientPlayer.hp / clientPlayer.hpMax, 40);

    // ctx.fillStyle = "#ffffff";
    // ctx.strokeStyle = "#000000";
    // ctx.lineWidth = 4;
    // ctx.font = "24px Miniset";
    // ctx.textAlign = "center";
    // ctx.textBaseline = "middle";
    // ctx.strokeText(Math.ceil(clientPlayer.hp) + " / " + clientPlayer.hpMax, canvas.width / 2, canvas.height - 30);
    // ctx.fillText(Math.ceil(clientPlayer.hp) + " / " + clientPlayer.hpMax, canvas.width / 2, canvas.height - 30);

    // ctx.fillStyle = "#444444";
    // ctx.strokeStyle = "#000000";
    // ctx.lineWidth = 8;
    // ctx.strokeRect(canvas.width / 2 - 190, canvas.height - 84, 380, 20);
    // ctx.fillRect(canvas.width / 2 - 190, canvas.height - 84, 380, 20);
    
    // let weapon = clientPlayer.weapons[clientPlayer.controls.weapon];

    // let attackCooldown = clientPlayer.attackCooldown;
    // let reloadCooldown = clientPlayer.reloadCooldown;
    // if (clientPlayer.controls.weapon != clientPlayer.controls.lastWeapon) {
    //     if (weapon.ammo == 0) {
    //         attackCooldown = 0;
    //         reloadCooldown = weapon.reloadSpeed;
    //     }
    //     else {
    //         attackCooldown = weapon.attackSpeed;
    //         reloadCooldown = 0;
    //     }
    // }

    // // ctx.fillStyle = "#ff9900";
    // let ammoGradient = ctx.createLinearGradient(canvas.width / 2 - 190, canvas.height - 84, canvas.width / 2 + 190, canvas.height - 84 + 20);
    // ammoGradient.addColorStop(0, "#aa6600");
    // ammoGradient.addColorStop(1, "#ff9900");
    // ctx.fillStyle = ammoGradient;
    // ctx.fillRect(canvas.width / 2 - 190, canvas.height - 84, 380 * weapon.ammo / weapon.ammoMax, 20);

    // ctx.fillStyle = "#ffffff";
    // ctx.strokeStyle = "#000000";
    // ctx.lineWidth = 4;
    // ctx.font = "16px Miniset";
    // ctx.textAlign = "center";
    // ctx.textBaseline = "middle";
    // ctx.strokeText(weapon.ammo + " / " + weapon.ammoMax, canvas.width / 2, canvas.height - 72);
    // ctx.fillText(weapon.ammo + " / " + weapon.ammoMax, canvas.width / 2, canvas.height - 72);

    // for (let i = 0; i < clientPlayer.weapons.length; i++) {
    //     let size = 50;

    //     ctx.save();
    //     ctx.translate(canvas.width / 2 - clientPlayer.weapons.length / 2 * (size + 12) + i * (size + 12) + 6, canvas.height - 96 - size);

    //     ctx.fillStyle = "#888888";
    //     if (i == clientPlayer.controls.weapon) {
    //         ctx.strokeStyle = "#0099ff";
    //     }
    //     else {
    //         ctx.strokeStyle = "#000000";
    //     }
    //     ctx.lineWidth = 8;
    //     ctx.strokeRect(0, 0, size, size);
    //     ctx.fillRect(0, 0, size, size);
    //     ctx.fillStyle = "#ff9900";
    //     let weaponAmmoGradient = ctx.createLinearGradient(0, 0, 0, size);
    //     weaponAmmoGradient.addColorStop(0, "#ff9900");
    //     weaponAmmoGradient.addColorStop(1, "#aa6600");
    //     ctx.fillStyle = weaponAmmoGradient;
    //     ctx.fillRect(0, size * (1 - clientPlayer.weapons[i].ammo / clientPlayer.weapons[i].ammoMax), size, size * clientPlayer.weapons[i].ammo / clientPlayer.weapons[i].ammoMax);
    //     if (i == clientPlayer.controls.weapon) {
    //         ctx.fillStyle = "#ffffff77";
    //         ctx.fillRect(0, size - size * Math.max(attackCooldown / clientPlayer.weapons[i].attackSpeed, 0), size, size * Math.max(attackCooldown / clientPlayer.weapons[i].attackSpeed, 0));
    //     }

    //     let image = clientPlayer.weapons[i].prerenderCanvas;

    //     ctx.save();
    //     ctx.translate(size / 2, size / 2);
    //     ctx.rotate(-Math.PI / 4);
    //     ctx.drawImage(image, -image.width * 2, -image.height * 2, image.width * 4, image.height * 4);
    //     ctx.restore();

    //     ctx.fillStyle = "#ffffff";
    //     ctx.strokeStyle = "#000000";
    //     ctx.lineWidth = 4;
    //     ctx.font = "16px Miniset";
    //     ctx.textAlign = "left";
    //     ctx.textBaseline = "top";
    //     ctx.strokeText((i + 1).toString(), 4, 4);
    //     ctx.fillText((i + 1).toString(), 4, 4);
    //     ctx.textAlign = "right";
    //     ctx.textBaseline = "bottom";
    //     ctx.strokeText(Rig.weaponData[clientPlayer.weapons[i].id].type, size - 2, size);
    //     ctx.fillText(Rig.weaponData[clientPlayer.weapons[i].id].type, size - 2, size);
    //     ctx.restore();
    // }

    // if (reloadCooldown > 0) {
    //     let reloadGradient = ctx.createLinearGradient(canvas.width / 2 - 194, canvas.height - 92, canvas.width / 2 + 194, canvas.height - 92 + 4);
    //     reloadGradient.addColorStop(0, "#00aa00");
    //     reloadGradient.addColorStop(1, "#00ff00");
    //     ctx.fillStyle = reloadGradient;
    //     ctx.fillRect(canvas.width / 2 - 194, canvas.height - 92, 388 * (1 - reloadCooldown / weapon.reloadSpeed), 4);
    //     ctx.fillStyle = "#00ff00";
    //     ctx.strokeStyle = "#000000";
    //     ctx.lineWidth = 4;
    //     ctx.font = "16px Miniset";
    //     ctx.textAlign = "center";
    //     ctx.textBaseline = "middle";
    //     ctx.strokeText("Reloading...", canvas.width / 2, canvas.height - 88);
    //     ctx.fillText("Reloading...", canvas.width / 2, canvas.height - 88);
    // }

    ctx.fillStyle = "#00ff00";
    ctx.font = "12px Miniset";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    let left = 6;
    let top = 6;
    let gap = 20;
    ctx.fillText("FPS: " + fps.length, left, top);
    ctx.fillText("Client Tick: " + clientPlayer.tick, left, top + gap);
    ctx.fillText("Server Tick: " + serverTick, left, top + gap * 2);
    ctx.fillText("Background Entities: " + BackgroundEntity.list.size, left, top + gap * 3);
    // document.getElementById("fpsOutline").innerText = "FPS: " + fps.length;
    fpsText.textContent = "FPS: " + fps.length;
};

function updateHud() {
    healthBarBackgroundContainer.style.width = clientPlayer.hp / clientPlayer.hpMax * 100 + "%";
    // healthBarTextOutline.innerText = Math.ceil(clientPlayer.hp) + " / " + clientPlayer.hpMax;
    healthBarText.textContent = Math.ceil(clientPlayer.hp) + " / " + clientPlayer.hpMax;
    
    let weapon = clientPlayer.weapons[clientPlayer.controls.weapon];

    if (weapon == null) {
        ammoBarBackgroundContainer.style.width = 100 + "%";
        // ammoBarTextOutline.innerText = "-";
        ammoBarText.textContent = "-";
        for (let i = 0; i < clientPlayer.weapons.length; i++) {
            updateWeapon(i);
        }
        reloadBar.style.visibility = "hidden";
        return;
    }
    
    let attackCooldown = clientPlayer.attackCooldown;
    let reloadCooldown = clientPlayer.reloadCooldown;
    if (clientPlayer.controls.weapon != clientPlayer.lastControls.weapon) {
        if (weapon.ammo == 0) {
            attackCooldown = 0;
            reloadCooldown = weapon.reloadSpeed;
        }
        else {
            attackCooldown = weapon.attackSpeed;
            reloadCooldown = 0;
        }
    }
    
    ammoBarBackgroundContainer.style.width = weapon.ammo / weapon.ammoMax * 100 + "%";
    // ammoBarTextOutline.innerText = weapon.ammo + " / " + weapon.ammoMax;
    ammoBarText.textContent = weapon.ammo + " / " + weapon.ammoMax;

    for (let i = 0; i < clientPlayer.weapons.length; i++) {
        updateWeapon(i);
    }

    if (reloadCooldown > 0) {
        reloadBar.style.visibility = "visible";
        reloadBarBackgroundContainer.style.width = (1 - reloadCooldown / weapon.reloadSpeed) * 100 + "%";
    }
    else {
        reloadBar.style.visibility = "hidden";
    }
};

let weaponDivs: {
    weapon: HTMLDivElement,
    backgroundContainer: HTMLDivElement,
    background: HTMLDivElement,
    cooldownContainer: HTMLDivElement,
    cooldown: HTMLDivElement,
    image: HTMLImageElement,
    // indexOutline: HTMLDivElement,
    index: Element,
    // typeOutline: HTMLDivElement,
    type: Element,
}[] = [];

function initAllWeapons() {
    document.getElementById("weapons").innerHTML = "";
    for (let i = 0; i < clientPlayer.weapons.length; i++) {
        let weapon = document.createElement("div");
        weapon.classList.add("weapon");
        document.getElementById("weapons").appendChild(weapon);

        let weaponBackgroundContainer = document.createElement("div");
        weaponBackgroundContainer.classList.add("weaponBackgroundContainer");
        weapon.appendChild(weaponBackgroundContainer);

        let weaponBackground = document.createElement("div");
        weaponBackground.classList.add("weaponBackground");
        weaponBackgroundContainer.appendChild(weaponBackground);

        let weaponCooldownContainer = document.createElement("div");
        weaponCooldownContainer.classList.add("weaponCooldownContainer");
        weapon.appendChild(weaponCooldownContainer);

        let weaponCooldown = document.createElement("div");
        weaponCooldown.classList.add("weaponCooldown");
        weaponCooldownContainer.appendChild(weaponCooldown);

        let weaponImage = document.createElement("img");
        weaponImage.classList.add("weaponImage");
        weapon.appendChild(weaponImage);

        let svgNS = "http://www.w3.org/2000/svg";

        let weaponIndexSvg = document.createElementNS(svgNS, "svg");
        weaponIndexSvg.classList.add("weaponIndexSvg");
        weapon.appendChild(weaponIndexSvg);

        let weaponIndex = document.createElementNS(svgNS, "text");
        weaponIndex.classList.add("weaponIndex");
        weaponIndex.setAttribute("x", "0");
        weaponIndex.setAttribute("y", "0");
        weaponIndex.setAttribute("text-anchor", "start");
        weaponIndex.setAttribute("dominant-baseline", "hanging");
        weaponIndex.setAttribute("stroke", "black");
        weaponIndex.setAttribute("stroke-width", "4");
        weaponIndex.setAttribute("stroke-linejoin", "round");
        weaponIndex.setAttribute("fill", "white");
        weaponIndexSvg.appendChild(weaponIndex);

        let weaponTypeSvg = document.createElementNS(svgNS, "svg");
        weaponTypeSvg.classList.add("weaponTypeSvg");
        weapon.appendChild(weaponTypeSvg);

        let weaponType = document.createElementNS(svgNS, "text");
        weaponType.classList.add("weaponType");
        weaponType.setAttribute("x", "100%");
        weaponType.setAttribute("y", "100%");
        weaponType.setAttribute("text-anchor", "end");
        weaponType.setAttribute("dominant-baseline", "auto");
        weaponType.setAttribute("stroke", "black");
        weaponType.setAttribute("stroke-width", "4");
        weaponType.setAttribute("stroke-linejoin", "round");
        weaponType.setAttribute("fill", "white");
        weaponTypeSvg.appendChild(weaponType);

        if (i == clientPlayer.controls.weapon) {
            weapon.classList.add("selected");
        }

        weapon.onclick = () => {
            selectWeapon(i);
        };

        weaponDivs[i] = {
            weapon: weapon,
            backgroundContainer: weaponBackgroundContainer,
            background: weaponBackground,
            cooldownContainer: weaponCooldownContainer,
            cooldown: weaponCooldown,
            image: weaponImage,
            index: weaponIndex,
            type: weaponType,
        };
        
        initWeapon(i);
    }
};
function initWeapon(weapon: number) {
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");
    let image = clientPlayer.weapons[weapon].prerenderCanvas;
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0);
    weaponDivs[weapon].image.src = canvas.toDataURL("image/png");
    weaponDivs[weapon].index.textContent = (weapon + 1).toString();
    weaponDivs[weapon].type.textContent = WeaponItem.data[clientPlayer.weapons[weapon].id].type;
    updateWeapon(weapon);
};
function updateWeapon(weapon: number) {
    weaponDivs[weapon].backgroundContainer.style.height = clientPlayer.weapons[weapon].ammo / clientPlayer.weapons[weapon].ammoMax * 100 + "%";
    if (clientPlayer.controls.weapon == weapon) {
        let attackCooldown = clientPlayer.attackCooldown;
        let reloadCooldown = clientPlayer.reloadCooldown;
        if (clientPlayer.controls.weapon != clientPlayer.lastControls.weapon) {
            if (clientPlayer.weapons[weapon].ammo == 0) {
                attackCooldown = 0;
                reloadCooldown = clientPlayer.weapons[weapon].reloadSpeed;
            }
            else {
                attackCooldown = clientPlayer.weapons[weapon].attackSpeed;
                reloadCooldown = 0;
            }
        }
        weaponDivs[weapon].cooldownContainer.style.height = Math.max(attackCooldown / clientPlayer.weapons[weapon].attackSpeed, 0) * 100 + "%";
    }
    else {
        weaponDivs[weapon].cooldownContainer.style.height = "0%";
    }
};
function selectWeapon(weapon: number) {
    if (weaponDivs[clientPlayer.controls.weapon] != null) {
        weaponDivs[clientPlayer.controls.weapon].weapon.classList.remove("selected");
    }
    if (weaponDivs[weapon] != null) {
        weaponDivs[weapon].weapon.classList.add("selected");
    }
    if (weapon != -1) {
        inventory.updateSelectedEquipSlot(weapon);
    }
    clientPlayer.controls.weapon = weapon;
};

export { tickGraph, drawHud, updateHud, initAllWeapons, initWeapon, selectWeapon };