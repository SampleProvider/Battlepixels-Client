import { socket } from "../../index.js";
import { keys, mouseX, mouseY } from "./controls.js";
import { drawUi } from "./ui.js";
import { mulberry32 } from "./random.js";
import { cameraX, cameraY, cameraScale, updateCamera } from "./camera.js";
import { Entity, EntityType } from "../entity/entity.js";
import { Rig, Controls } from "../entity/rig.js";
import { Projectile } from "../entity/projectile.js";
import { clientPlayer } from "../entity/client-player.js";
import { Particle, DamageParticle, CritDamageParticle, ExplosionParticle, FireworkParticle } from "../entity/particle.js";
import { SimulatedMap } from "../map/map.js";
import { MapRenderer, OffscreenCanvasMapRenderer } from "../map/renderer.js";
import { webgpuSupported, WebgpuMapRenderer } from "../map/webgpu-renderer.js";
import { transitionToGame } from "../menu/menu.js";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

function onResize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    ctx.imageSmoothingEnabled = false;
    // document.body.style.setProperty("--border-size", Number(getComputedStyle(pixelPicker).getPropertyValue("border-left-width").replaceAll("px", "")) / 2 + "px");
};
window.addEventListener("resize", () => {
    onResize();
});
onResize();

let tps = 20;
let clientPhysicsEnabled = true;
let serverTick = 0;

let mapRenderer: MapRenderer = null;
if (webgpuSupported) {
    mapRenderer = new WebgpuMapRenderer();
    await (mapRenderer as WebgpuMapRenderer).init();
}
else {
    mapRenderer = new OffscreenCanvasMapRenderer();
}

socket.connect();
socket.on("updateData", (data) => {
    if (clientPlayer.id == null) {
        console.log("didnt recieve config")
        return;
    }
    for (let [_, entity] of Entity.list) {
        entity.updated = false;
    }
    for (let i in data.entity) {
        if (clientPhysicsEnabled && data.entity[i].id == clientPlayer.id) {
            continue;
        }
        if (data.entity[i].type == EntityType.Player) {
            let entity = Entity.list.get(data.entity[i].id) as Rig;
            if (entity == null) {
                new Rig(data.entity[i].id, data.entity[i].x, data.entity[i].y, data.entity[i].width, data.entity[i].height, data.entity[i].phantomFrames, data.entity[i].controls, data.entity[i].customizations, data.entity[i].animation, data.entity[i].animationFrame, data.entity[i].weapon, data.entity[i].hp, data.entity[i].hpMax, data.entity[i].name);
            }
            else {
                entity.speedX = (data.entity[i].x - entity.x) / (60 / tps);
                entity.speedY = (data.entity[i].y - entity.y) / (60 / tps);
                entity.phantomFrames = data.entity[i].phantomFrames;
                entity.interpolationFrames = 60 / tps;
                entity.controls = data.entity[i].controls;
                entity.customizations = data.entity[i].customizations;
                entity.animation = data.entity[i].animation;
                entity.animationFrame = data.entity[i].animationFrame;
                if (data.entity[i].weapon.id != entity.weapon.id) {
                    entity.weapon = data.entity[i].weapon;
                    Rig.prerenderWeapon(entity.weapon);
                }
                else {
                    for (let j in data.entity[i].weapon.customizations) {
                        if (data.entity[i].weapon.customizations[j] != entity.weapon.customizations[j]) {
                            entity.weapon = data.entity[i].weapon;
                            Rig.prerenderWeapon(entity.weapon);
                            break;
                        }
                    }
                }
                entity.name = data.entity[i].name;
                entity.hp = data.entity[i].hp;
                entity.hpMax = data.entity[i].hpMax;
                entity.updated = true;
            }
        }
        else if (data.entity[i].type == EntityType.Projectile) {
            let entity = Entity.list.get(data.entity[i].id) as Projectile;
            if (entity == null) {
                new Projectile(data.entity[i].id, data.entity[i].x, data.entity[i].y, data.entity[i].width, data.entity[i].height, data.entity[i].phantomFrames, data.entity[i].projectileType, data.entity[i].rotation);
            }
            else {
                entity.speedX = (data.entity[i].x - entity.x) / (60 / tps);
                entity.speedY = (data.entity[i].y - entity.y) / (60 / tps);
                entity.speedRotation = (data.entity[i].rotation - entity.rotation) / (60 / tps);
                entity.phantomFrames = data.entity[i].phantomFrames;
                entity.interpolationFrames = 60 / tps;
                entity.updated = true;
            }
        }
    }
    for (let i in data.particle) {
        switch (data.particle[i].type) {
            case "damage":
                new DamageParticle(data.particle[i].x, data.particle[i].y, data.particle[i].data.value);
                break;
            case "crit_damage":
                new CritDamageParticle(data.particle[i].x, data.particle[i].y, data.particle[i].data.value);
                break;
            case "explosion":
                for (let j = 0; j < data.particle[i].data.radius * 4; j++) {
                    new ExplosionParticle(data.particle[i].x, data.particle[i].y, data.particle[i].data.vectorX, data.particle[i].data.vectorY, data.particle[i].data.radius);
                }
                break;
            case "firework":
                for (let j = 0; j < data.particle[i].data.radius * 4; j++) {
                    new FireworkParticle(data.particle[i].x, data.particle[i].y, data.particle[i].data.vectorX, data.particle[i].data.vectorY, data.particle[i].data.radius, data.particle[i].data.color);
                }
                break;
        }
    }
    if (data.map.id != null) {
        mapRenderer.setMap(new SimulatedMap(data.map.id, data.map.tick, data.map.width, data.map.height, data.map.compressedGrid, data.map.chunks));
        clientPlayer.map = data.map.id;
        transitionToGame();
    }
    if (data.map.updates != null) {
        mapRenderer.map.addUpdates(data.map.updates);
        mapRenderer.map.simulate();
    }
    serverTick = data.tick;
    if (data.clientPlayer.respawning) {
        document.getElementById("respawnContainer").style.display = "revert-layer";
        if (clientPhysicsEnabled) {
            clientPlayer.hp = data.clientPlayer.hp;
            clientPlayer.hpMax = data.clientPlayer.hpMax;
            clientPlayer.respawning = data.clientPlayer.respawning;
        //     clientPlayer.respawnTime = data.clientPlayer.respawnTime;
        //     while (clientPlayer.tick < data.tick) {
        //         updateTick(false);
        //     }
        //     setUpdateTickTimeout(1.5);
        }
        // else {
        //     socket.emit("updateTick");
        // }
        document.getElementById("respawnTime").innerText = "Respawn in " + (Math.max(data.clientPlayer.respawnTick - data.tick, 0) / tps).toFixed(2) + "s";
        (document.getElementById("respawnButton") as HTMLButtonElement).disabled = data.clientPlayer.respawnTick > data.tick;
    }
    else {
        document.getElementById("respawnContainer").style.display = "none";
        if (clientPhysicsEnabled) {
            clientPlayer.width = data.clientPlayer.width;
            clientPlayer.height = data.clientPlayer.height;
            clientPlayer.moveSpeed = data.clientPlayer.moveSpeed;
            clientPlayer.jumpHeight = data.clientPlayer.jumpHeight;
            clientPlayer.stepHeight = data.clientPlayer.stepHeight;
            clientPlayer.gravity = data.clientPlayer.gravity;
            clientPlayer.customizations = data.clientPlayer.customizations;
            clientPlayer.animationSpeed = data.clientPlayer.animationSpeed;
            if (clientPlayer.weapons.length != data.clientPlayer.weapons.length) {
                clientPlayer.weapons = data.clientPlayer.weapons;
                for (let i in clientPlayer.weapons) {
                    Rig.prerenderWeapon(clientPlayer.weapons[i]);
                }
            }
            else {
                for (let i in clientPlayer.weapons) {
                    if (data.clientPlayer.weapons[i].id != clientPlayer.weapons[i].id) {
                        clientPlayer.weapons[i].id = data.clientPlayer.weapons[i].id;
                        Rig.prerenderWeapon(clientPlayer.weapons[i]);
                    }
                    else {
                        for (let j in data.clientPlayer.weapons[i].customizations) {
                            if (data.clientPlayer.weapons[i].customizations[j] != clientPlayer.weapons[i].customizations[j]) {
                                clientPlayer.weapons[i].customizations = data.clientPlayer.weapons[i].customizations;
                                Rig.prerenderWeapon(clientPlayer.weapons[i]);
                                break;
                            }
                        }
                    }
                    clientPlayer.weapons[i].offsetX = data.clientPlayer.weapons[i].offsetX;
                    clientPlayer.weapons[i].offsetY = data.clientPlayer.weapons[i].offsetY;
                    clientPlayer.weapons[i].damage = data.clientPlayer.weapons[i].damage;
                    clientPlayer.weapons[i].critDamage = data.clientPlayer.weapons[i].critDamage;
                    clientPlayer.weapons[i].knockback = data.clientPlayer.weapons[i].knockback;
                    clientPlayer.weapons[i].piercing = data.clientPlayer.weapons[i].piercing;
                    clientPlayer.weapons[i].attackSpeed = data.clientPlayer.weapons[i].attackSpeed;
                    clientPlayer.weapons[i].projectileSpeed = data.clientPlayer.weapons[i].projectileSpeed;
                    clientPlayer.weapons[i].projectileCount = data.clientPlayer.weapons[i].projectileCount;
                    clientPlayer.weapons[i].projectileSpread = data.clientPlayer.weapons[i].projectileSpread;
                    clientPlayer.weapons[i].recoil = data.clientPlayer.weapons[i].recoil;
                    clientPlayer.weapons[i].ammoMax = data.clientPlayer.weapons[i].ammoMax;
                    clientPlayer.weapons[i].reloadSpeed = data.clientPlayer.weapons[i].reloadSpeed;
                }
            }
            clientPlayer.hp = data.clientPlayer.hp;
            clientPlayer.hpMax = data.clientPlayer.hpMax;
            clientPlayer.respawning = data.clientPlayer.respawning;
            clientPlayer.name = data.clientPlayer.name;
            if (data.clientPlayer.overrideClient) {
                let overrideTick = data.clientPlayer.overrideTick;
                clientPlayer.x = data.clientPlayer.x;
                clientPlayer.y = data.clientPlayer.y;
                clientPlayer.speedX = data.clientPlayer.speedX;
                clientPlayer.speedY = data.clientPlayer.speedY;
                clientPlayer.weapons = data.clientPlayer.weapons;
                for (let i in clientPlayer.weapons) {
                    clientPlayer.weapons[i].ammo = data.clientPlayer.weapons[i].ammo;
                    Rig.prerenderWeapon(clientPlayer.weapons[i]);
                }
                clientPlayer.attackCooldown = data.clientPlayer.attackCooldown;
                clientPlayer.reloadCooldown = data.clientPlayer.reloadCooldown;
                if (overrideTick > clientPlayer.tick) {
                    clientPlayer.tick = overrideTick;
                }
                while (overrideTick < clientPlayer.tick) {
                    clientPlayer.controls = structuredClone(clientPlayer.controlsHistory.get(overrideTick));
                    clientPlayer.update();
                    overrideTick += 1;
                }
            }
            clientPlayer.controlsHistory.delete(data.clientPlayer.overrideTick);

            let clientEntity = Entity.list.get(clientPlayer.id) as Rig;
            if (data.clientPlayer.hp > 0) {
                if (clientEntity == null) {
                    clientEntity = new Rig(clientPlayer.id, clientPlayer.x, clientPlayer.y, clientPlayer.width, clientPlayer.height, 1, clientPlayer.controls, clientPlayer.customizations, clientPlayer.animation, clientPlayer.animationFrame, clientPlayer.weapons[clientPlayer.controls.weapon], data.clientPlayer.hp, data.clientPlayer.hpMax, data.clientPlayer.name);
                }
            }

            console.log(data.tick - clientPlayer.tick)

            while (clientPlayer.tick < data.tick) {
                updateTick(false);
            }
            // setUpdateTickTimeout(1.5);

            if (data.clientPlayer.hp > 0) {
                if (clientEntity != null) {
                    clientEntity.speedX = (clientPlayer.x - clientEntity.x) / (60 / tps);
                    clientEntity.speedY = (clientPlayer.y - clientEntity.y) / (60 / tps);
                    clientEntity.interpolationFrames = 60 / tps;
                    clientEntity.controls = clientPlayer.controls;
                    clientEntity.customizations = clientPlayer.customizations;
                    clientEntity.animation = clientPlayer.animation;
                    clientEntity.animationFrame = clientPlayer.animationFrame;
                    clientEntity.weapon = clientPlayer.weapons[clientPlayer.controls.weapon];
                    clientEntity.name = clientPlayer.name;
                    clientEntity.updated = true;
                }
            }
        }
        else {
            clientPlayer.controls.left = keys.get("A") == true;
            clientPlayer.controls.right = keys.get("D") == true;
            clientPlayer.controls.up = keys.get("W") == true;
            clientPlayer.controls.down = keys.get("S") == true;
            clientPlayer.controls.attack = keys.get("Left Mouse Button") == true;
            clientPlayer.controls.reload = keys.get("R") == true;
            clientPlayer.controls.angle = Math.atan2(mouseY / cameraScale - cameraY - Entity.list.get(clientPlayer.id).y - clientPlayer.weapons[clientPlayer.controls.weapon].offsetY, mouseX / cameraScale - cameraX - Entity.list.get(clientPlayer.id).x - clientPlayer.weapons[clientPlayer.controls.weapon].offsetX);
            // let controls: Controls = {
            //     left: keys.get("A") == true,
            //     right: keys.get("D") == true,
            //     up: keys.get("W") == true,
            //     down: keys.get("S") == true,
            //     attack: keys.get("Left Mouse Button") == true,
            //     angle: Math.atan2(mouseY / cameraScale - cameraY - Entity.list.get(clientPlayer.id).y + 18, mouseX / cameraScale - cameraX - Entity.list.get(clientPlayer.id).x),
            //     weapon: clientPlayer.controls.weapon,
            // };
            socket.emit("updateTick", {
                controls: clientPlayer.controls,
            });
        }
        let clientEntity = Entity.list.get(clientPlayer.id) as Rig;
        if (clientEntity != null) {
            clientEntity.hp = data.clientPlayer.hp;
            clientEntity.hpMax = data.clientPlayer.hpMax;
        }
    }

    for (let [_, entity] of Entity.list) {
        if (entity.updated == false) {
            Entity.list.delete(entity.id);
        }
    }
    if (performance.now() - lastFrame > 10) {
        updateFrame();
    }
});
socket.on("initData", (data) => {
    console.log("client starts at " + data.tick)
    clientPlayer.id = data.id;
    clientPlayer.random = mulberry32(data.id);
    clientPlayer.tick = data.tick;
});
socket.on("configData", (data) => {
    tps = data.tps;
    if (!data.databaseEnabled) {
        document.getElementById("signInResponse").style.display = "revert-layer";
        document.getElementById("signInResponse").innerText = "Database disabled, use any name you want";
        document.getElementById("signInResponse").style.color = "red";
    }
    clientPhysicsEnabled = data.clientPhysicsEnabled;
});
document.getElementById("respawnButton").onclick = function() {
    socket.emit("respawn");
};

let lastFrame = performance.now();

let fps: number[] = [];

function updateFrame() {
    if (clientPlayer.id == null) {
        // window.requestAnimationFrame(updateFrame);
        return;
    }

    if (mapRenderer instanceof OffscreenCanvasMapRenderer) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (mapRenderer instanceof WebgpuMapRenderer) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    Entity.updateAll();
    Particle.updateAll();

    updateCamera();
    ctx.scale(cameraScale, cameraScale);
    ctx.translate(cameraX, cameraY);

    // ctx.drawImage(mapRenderer.canvas, Math.max(-cameraX / 4, 0), Math.max(-cameraY / 4, 0), Math.min((-cameraX + canvas.width) / 4, mapRenderer.map.width), Math.min((-cameraY + canvas.height) / 4, mapRenderer.map.height), Math.max(-cameraX, 0), Math.max(-cameraY, 0), Math.min((-cameraX + canvas.width), mapRenderer.map.width), Math.min((-cameraY + canvas.height), mapRenderer.map.height));
    if (mapRenderer instanceof WebgpuMapRenderer) {
        mapRenderer.render();
    }
    // if (mapRenderer instanceof OffscreenCanvasMapRenderer || mapRenderer instanceof WebgpuMapRenderer) {
    //     ctx.drawImage(mapRenderer.canvas, 0, 0, mapRenderer.map.width * 4, mapRenderer.map.height * 4);
    // }

    Entity.drawAll(ctx);
    Particle.drawAll(ctx);

    ctx.resetTransform();

    fps.push(performance.now());
    while (performance.now() - fps[0] > 1000) {
        fps.shift();
    }

    drawUi(ctx);

    lastFrame = performance.now();
    // window.requestAnimationFrame(updateFrame);
};
// window.requestAnimationFrame(updateFrame);

function updateTick(drawFrame: boolean) {
    if (clientPlayer.respawning) {
        return;
    }
    clientPlayer.tick += 1;
    // if (clientPlayer.id == null || Entity.list.get(clientPlayer.id) == null) {
    //     setTimeout(updateTick, 1000 / tps);
    //     return;
    // }
    // let controls: Controls = {
    //     left: keys.get("A") == true,
    //     right: keys.get("D") == true,
    //     up: keys.get("W") == true,
    //     down: keys.get("S") == true,
    //     attack: keys.get("Left Mouse Button") == true,
    //     angle: Math.atan2(mouseY / cameraScale - cameraY - Entity.list.get(clientPlayer.id).y + 18, mouseX / cameraScale - cameraX - Entity.list.get(clientPlayer.id).x),
    // };
    clientPlayer.controls.left = keys.get("A") == true;
    clientPlayer.controls.right = keys.get("D") == true;
    clientPlayer.controls.up = keys.get("W") == true;
    clientPlayer.controls.down = keys.get("S") == true;
    clientPlayer.controls.attack = keys.get("Left Mouse Button") == true;
    clientPlayer.controls.reload = keys.get("R") == true;
    clientPlayer.controls.angle = Math.atan2(mouseY / cameraScale - cameraY - Entity.list.get(clientPlayer.id).y - clientPlayer.weapons[clientPlayer.controls.weapon].offsetY, mouseX / cameraScale - cameraX - Entity.list.get(clientPlayer.id).x - clientPlayer.weapons[clientPlayer.controls.weapon].offsetX);
    clientPlayer.controlsHistory.set(clientPlayer.tick, structuredClone(clientPlayer.controls));
    clientPlayer.update();
    // if (clientPlayer.respawning) {
    //     socket.emit("updateTick", {
    //         tick: clientPlayer.tick,
    //     });
    // }
    // else {
    let weapons = [];
    for (let i in clientPlayer.weapons) {
        weapons.push({
            ammo: clientPlayer.weapons[i].ammo}
        );
    }
    socket.emit("updateTick", {
        tick: clientPlayer.tick,
        x: clientPlayer.x,
        y: clientPlayer.y,
        speedX: clientPlayer.speedX,
        speedY: clientPlayer.speedY,
        controls: clientPlayer.controls,
        weapons: weapons,
    });
    // }
    if (drawFrame) {
        let clientEntity = Entity.list.get(clientPlayer.id) as Rig;
        if (clientEntity != null) {
            clientEntity.speedX = (clientPlayer.x - clientEntity.x) / (60 / tps);
            clientEntity.speedY = (clientPlayer.y - clientEntity.y) / (60 / tps);
            clientEntity.interpolationFrames = 60 / tps;
            clientEntity.controls = clientPlayer.controls;
            clientEntity.customizations = clientPlayer.customizations;
            clientEntity.animation = clientPlayer.animation;
            clientEntity.animationFrame = clientPlayer.animationFrame;
            clientEntity.weapon = clientPlayer.weapons[clientPlayer.controls.weapon];
            clientEntity.name = clientPlayer.name;
            clientEntity.updated = true;
        }
        updateFrame();
    }
    // setTimeout(updateTick, 1000 / tps);
    if (drawFrame) {
        setUpdateTickTimeout(1);
    }
};
// setTimeout(updateTick, 1000 / tps);
let updateTickTimeout: NodeJS.Timeout = null;
function setUpdateTickTimeout(delayFactor: number) {
    if (updateTickTimeout != null) {
        clearTimeout(updateTickTimeout);
    }
    updateTickTimeout = setTimeout(() => {
        updateTick(true);
    }, 1000 / tps * delayFactor);
};

export { serverTick, fps };