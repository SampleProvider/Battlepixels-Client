import { serverTick, fps } from "./game.js";
import { images, weaponData } from "./loader.js";
import { clientPlayer } from "../entity/client-player.js";

function drawUi(ctx: CanvasRenderingContext2D) {
    let canvas = ctx.canvas;

    ctx.fillStyle = "#444444";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 8;
    ctx.strokeRect(canvas.width / 2 - 200, canvas.height - 52, 400, 40);
    ctx.fillRect(canvas.width / 2 - 200, canvas.height - 52, 400, 40);
    
    // ctx.fillStyle = "#ff0000";
    let healthGradient = ctx.createLinearGradient(canvas.width / 2 - 200, canvas.height - 52, canvas.width / 2 + 200, canvas.height - 52 + 40);
    healthGradient.addColorStop(0, "#990000");
    healthGradient.addColorStop(1, "#ff2200");
    ctx.fillStyle = healthGradient;
    ctx.fillRect(canvas.width / 2 - 200, canvas.height - 52, 400 * clientPlayer.hp / clientPlayer.hpMax, 40);

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.font = "24px Miniset";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText(Math.ceil(clientPlayer.hp) + " / " + clientPlayer.hpMax, canvas.width / 2, canvas.height - 30);
    ctx.fillText(Math.ceil(clientPlayer.hp) + " / " + clientPlayer.hpMax, canvas.width / 2, canvas.height - 30);

    ctx.fillStyle = "#444444";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 8;
    ctx.strokeRect(canvas.width / 2 - 190, canvas.height - 84, 380, 20);
    ctx.fillRect(canvas.width / 2 - 190, canvas.height - 84, 380, 20);
    
    let weapon = clientPlayer.weapons[clientPlayer.controls.weapon];

    // ctx.fillStyle = "#ff9900";
    let ammoGradient = ctx.createLinearGradient(canvas.width / 2 - 190, canvas.height - 84, canvas.width / 2 + 190, canvas.height - 84 + 20);
    ammoGradient.addColorStop(0, "#aa6600");
    ammoGradient.addColorStop(1, "#ff9900");
    ctx.fillStyle = ammoGradient;
    ctx.fillRect(canvas.width / 2 - 190, canvas.height - 84, 380 * weapon.ammo / weapon.ammoMax, 20);

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.font = "16px Miniset";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText(weapon.ammo + " / " + weapon.ammoMax, canvas.width / 2, canvas.height - 72);
    ctx.fillText(weapon.ammo + " / " + weapon.ammoMax, canvas.width / 2, canvas.height - 72);

    for (let i = 0; i < clientPlayer.weapons.length; i++) {
        let size = 50;

        ctx.save();
        ctx.translate(canvas.width / 2 - clientPlayer.weapons.length / 2 * (size + 12) + i * (size + 12) + 6, canvas.height - 96 - size);

        ctx.fillStyle = "#888888";
        if (i == clientPlayer.controls.weapon) {
            ctx.strokeStyle = "#0099ff";
        }
        else {
            ctx.strokeStyle = "#000000";
        }
        ctx.lineWidth = 8;
        ctx.strokeRect(0, 0, size, size);
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = "#ff9900";
        let weaponAmmoGradient = ctx.createLinearGradient(0, 0, 0, size);
        weaponAmmoGradient.addColorStop(0, "#ff9900");
        weaponAmmoGradient.addColorStop(1, "#aa6600");
        ctx.fillStyle = weaponAmmoGradient;
        ctx.fillRect(0, size * (1 - clientPlayer.weapons[i].ammo / clientPlayer.weapons[i].ammoMax), size, size * clientPlayer.weapons[i].ammo / clientPlayer.weapons[i].ammoMax);
        if (i == clientPlayer.controls.weapon) {
            ctx.fillStyle = "#ffffff77";
            ctx.fillRect(0, size - size * Math.max(clientPlayer.attackCooldown / clientPlayer.weapons[i].attackSpeed, 0), size, size * Math.max(clientPlayer.attackCooldown / clientPlayer.weapons[i].attackSpeed, 0));
        }

        let image = clientPlayer.weapons[i].prerenderCanvas;

        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.rotate(-Math.PI / 4);
        ctx.drawImage(image, -image.width * 2, -image.height * 2, image.width * 4, image.height * 4);
        ctx.restore();

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 4;
        ctx.font = "16px Miniset";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.strokeText((i + 1).toString(), 4, 4);
        ctx.fillText((i + 1).toString(), 4, 4);
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.strokeText(weaponData[clientPlayer.weapons[i].id].type, size - 2, size);
        ctx.fillText(weaponData[clientPlayer.weapons[i].id].type, size - 2, size);
        ctx.restore();
    }

    if (clientPlayer.reloadCooldown > 0) {
        let reloadGradient = ctx.createLinearGradient(canvas.width / 2 - 194, canvas.height - 92, canvas.width / 2 + 194, canvas.height - 92 + 4);
        reloadGradient.addColorStop(0, "#00aa00");
        reloadGradient.addColorStop(1, "#00ff00");
        ctx.fillStyle = reloadGradient;
        ctx.fillRect(canvas.width / 2 - 194, canvas.height - 92, 388 * (1 - clientPlayer.reloadCooldown / weapon.reloadSpeed), 4);
        ctx.fillStyle = "#00ff00";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 4;
        ctx.font = "16px Miniset";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.strokeText("Reloading...", canvas.width / 2, canvas.height - 88);
        ctx.fillText("Reloading...", canvas.width / 2, canvas.height - 88);
    }

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
};

export { drawUi };