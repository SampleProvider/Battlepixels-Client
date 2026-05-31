import { socket } from "../../index.js";
import { SimulatedMap, StaticMap } from "../map/map.js";
import { Npc } from "../entity/npc.js";
import { cameraX, cameraY, cameraScale, resetCamera, updateCamera, updateCameraOnResize } from "./camera.js";
import { clientPlayer } from "../entity/client-player.js";
import { Monster } from "../entity/monster.js";
import { Projectile } from "../entity/projectile.js";
import { keys, keybinds, mouseX, mouseY } from "./controls.js";
import { mulberry32 } from "./random.js";
import { Entity, EntityType } from "../entity/entity.js";
import { Particle, DamageParticle, CritDamageParticle, ExplosionParticle, FireworkParticle } from "../entity/particle.js";
import { MapRenderer, OffscreenCanvasMapRenderer } from "../map/renderer.js";
import { webgpuSupported, WebgpuMapRenderer } from "../map/webgpu-renderer.js";
import { transitionToGame } from "../menu/menu.js";
import { BackgroundEntity } from "../map/background-entity.js";
import { BackgroundMap } from "../map/background-map.js";
import { Player } from "../entity/player.js";
import { drawCustomizations, prerenderCustomizations } from "../ui/customizations.js";
import { currentWeather, initWeather, updateWeather } from "../map/weather.js";
import { drawHud, initAllWeapons, initWeapon, tickGraph, updateHud } from "../ui/hud.js";
import { loaded } from "./loader.js";

const canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
const backgroundOffscreenCanvas = new OffscreenCanvas(canvas.width, canvas.height);
const backgroundOffscreenCtx = backgroundOffscreenCanvas.getContext("2d");
const belowOffscreenCanvas = new OffscreenCanvas(canvas.width, canvas.height);
const belowOffscreenCtx = belowOffscreenCanvas.getContext("2d");
const aboveOffscreenCanvas = new OffscreenCanvas(canvas.width, canvas.height);
const aboveOffscreenCtx = aboveOffscreenCanvas.getContext("2d");
aboveOffscreenCtx.textRendering = "optimizeSpeed";

function onResize() {
    updateCameraOnResize(window.innerWidth * devicePixelRatio, window.innerHeight * devicePixelRatio);
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    ctx.imageSmoothingEnabled = false;
    backgroundOffscreenCanvas.width = window.innerWidth * devicePixelRatio;
    backgroundOffscreenCanvas.height = window.innerHeight * devicePixelRatio;
    backgroundOffscreenCtx.imageSmoothingEnabled = false;
    belowOffscreenCanvas.width = window.innerWidth * devicePixelRatio;
    belowOffscreenCanvas.height = window.innerHeight * devicePixelRatio;
    belowOffscreenCtx.imageSmoothingEnabled = false;
    aboveOffscreenCanvas.width = window.innerWidth * devicePixelRatio;
    aboveOffscreenCanvas.height = window.innerHeight * devicePixelRatio;
    aboveOffscreenCtx.imageSmoothingEnabled = false;
    aboveOffscreenCtx.textRendering = "optimizeSpeed";
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
socket.on("connect", () => {
    console.log("connected");
});
socket.on("configData", async (data) => {
    console.log("recieved config data")
    async function waitForLoad() {
        if (!loaded) {
            await new Promise((res) => {
                setTimeout(res, 10);
            });
            await waitForLoad();
        }
    };
    await waitForLoad();
    clientPlayer.id = data.id;
    clientPlayer.random = mulberry32(data.id);
    tps = data.tps;
    if (!data.databaseEnabled) {
        document.getElementById("signInResponse").style.display = "revert-layer";
        document.getElementById("signInResponse").innerText = "Database disabled, use any name you want";
        document.getElementById("signInResponse").style.color = "red";
    }
    clientPhysicsEnabled = data.clientPhysicsEnabled;
    
    clientPlayer.map = data.map.id;
    StaticMap.list.clear();
    mapRenderer.setMap(new StaticMap(data.map.id, data.map.width, data.map.height, data.map.layers, data.map.tilesets, data.map.backgroundColor, data.map.collisions, data.map.teleporters, data.map.lights, data.map.collectiblePerks, data.map.renderableObjects));
    BackgroundEntity.list.clear();
    new BackgroundMap(mapRenderer);
    resetCamera();
    currentWeather.cloudDensity = data.weather.cloudDensity;
    currentWeather.snowDensity = data.weather.snowDensity;
    currentWeather.windSpeedX = data.weather.windSpeedX;
    currentWeather.windSpeedY = data.weather.windSpeedY;
    initWeather();
    
    if (localStorage.getItem("menuPlayer") != null) {
        try {
            let data = JSON.parse(localStorage.getItem("menuPlayer"));
            if (data.colorLookup.type == "string") {
                data.colorLookup = data.colorLookup.data;
            }
            else {
                // @ts-expect-error
                data.colorLookup = new Uint8ClampedArray(Uint8Array.fromBase64(data.colorLookup.data));
            }
            // let player = new Player(clientPlayer.id, data.x, data.y, data.width, data.height, 1, 0, clientPlayer.controls, null, { uvLookup: "player_uv_lookup", uvSource: "player_uv_source", colorLookup: data.colorLookup }, 22, 0, data.hp, data.hpMax, false, data.name, false, null);
            let player = new Player(clientPlayer.id, data.x, data.y, data.width, data.height, 1, 0, clientPlayer.controls, null, { uvLookup: "player_uv_lookup", uvSource: "player_uv_source", colorLookup: data.colorLookup }, 6, 0, data.hp, data.hpMax, false, data.name, false, null);
            if (player.image == null) {
                player.remove();
            }
        }
        catch (err) {
        }
    }
});
socket.on("initData", (data) => {
    clientPlayer.tick = data.tick;
});
socket.on("updateData", (data) => {
    if (clientPlayer.id == null) {
        console.log("didnt recieve config")
        return;
    }
    if (data.map.id != null) {
        clientPlayer.map = data.map.id;
        for (let [_, entity] of Entity.list) {
            entity.remove();
        }
        Particle.list.clear();
        // mapRenderer.setMap(new SimulatedMap(data.map.id, data.map.tick, data.map.width, data.map.height, data.map.compressedGrid, data.map.chunks));
        StaticMap.list.clear();
        mapRenderer.setMap(new StaticMap(data.map.id, data.map.width, data.map.height, data.map.layers, data.map.tilesets, data.map.backgroundColor, data.map.collisions, data.map.teleporters, data.map.lights, data.map.collectiblePerks, data.map.renderableObjects));
        BackgroundEntity.list.clear();
        new BackgroundMap(mapRenderer);
        clientPlayer.teleporting = false;
    }
    for (let [_, entity] of Entity.list) {
        entity.updated = false;
    }
    for (let i in data.entity) {
        if (clientPhysicsEnabled && data.entity[i].id == clientPlayer.id) {
            continue;
        }
        if (data.entity[i].type == EntityType.Player) {
            let entity = Entity.list.get(data.entity[i].id) as Player;
            if (entity == null) {
                if (data.entity[i].colorLookup instanceof ArrayBuffer) {
                    data.entity[i].colorLookup = new Uint8ClampedArray(data.entity[i].colorLookup);
                }
                new Player(data.entity[i].id, data.entity[i].x, data.entity[i].y, data.entity[i].width, data.entity[i].height, data.entity[i].phantomFrames, data.entity[i].dashTime, data.entity[i].controls, data.entity[i].collision, { uvLookup: "player_uv_lookup", uvSource: "player_uv_source", colorLookup: data.entity[i].colorLookup }, data.entity[i].animationFrame, data.entity[i].animationRotation, data.entity[i].hp, data.entity[i].hpMax, data.entity[i].drawHp, data.entity[i].name, data.entity[i].drawName, data.entity[i].weapon);
            }
            else {
                if (data.entity[i].noInterpolation) {
                    entity.x = data.entity[i].x;
                    entity.y = data.entity[i].y;
                    entity.animationRotation = data.entity[i].animationRotation;
                    entity.speedX = 0;
                    entity.speedY = 0;
                    entity.animationSpeedRotation = 0;
                }
                else {
                    entity.interpolationFrames = Math.min(entity.interpolationFrames + 1, 2);
                    entity.interpolationFrames = 1;
                    entity.speedX = (data.entity[i].x - entity.x) / entity.interpolationFrames;
                    entity.speedY = (data.entity[i].y - entity.y) / entity.interpolationFrames;
                    entity.animationSpeedRotation = (data.entity[i].animationRotation - entity.animationRotation) / entity.interpolationFrames;
                }
                entity.phantomFrames = data.entity[i].phantomFrames;
                entity.dashTime = data.entity[i].dashTime;
                entity.controls = data.entity[i].controls;
                entity.collision = data.entity[i].collision;
                if (data.entity[i].colorLookup != null) {
                    if (data.entity[i].colorLookup instanceof ArrayBuffer) {
                        data.entity[i].colorLookup = new Uint8ClampedArray(data.entity[i].colorLookup);
                    }
                    entity.setImage({ uvLookup: "player_uv_lookup", uvSource: "player_uv_source", colorLookup: data.entity[i].colorLookup });
                }
                entity.animationFrame = data.entity[i].animationFrame;
                entity.drawName = data.entity[i].drawName;
                entity.hp = data.entity[i].hp;
                entity.hpMax = data.entity[i].hpMax;
                entity.drawHp = data.entity[i].drawHp;
                if (data.entity[i].weapon?.id != entity.weapon?.id) {
                    entity.weapon = data.entity[i].weapon;
                    Player.prerenderWeapon(entity.weapon);
                }
                else if (data.entity[i].weapon != null) {
                    for (let j in data.entity[i].weapon.customizations) {
                        if (data.entity[i].weapon.customizations[j] != entity.weapon.customizations[j]) {
                            entity.weapon = data.entity[i].weapon;
                            Player.prerenderWeapon(entity.weapon);
                            break;
                        }
                    }
                }
                entity.updated = true;
            }
        }
        else if (data.entity[i].type == EntityType.Npc) {
            let entity = Entity.list.get(data.entity[i].id) as Npc;
            if (entity == null) {
                new Npc(data.entity[i].id, data.entity[i].x, data.entity[i].y, data.entity[i].width, data.entity[i].height, data.entity[i].phantomFrames, data.entity[i].dashTime, data.entity[i].controls, data.entity[i].collision, data.entity[i].animationFrame, data.entity[i].animationRotation, data.entity[i].hp, data.entity[i].hpMax, data.entity[i].drawHp, data.entity[i].name, data.entity[i].drawName, data.entity[i].npcType);
            }
            else {
                if (data.entity[i].noInterpolation) {
                    entity.x = data.entity[i].x;
                    entity.y = data.entity[i].y;
                    entity.animationRotation = data.entity[i].animationRotation;
                    entity.speedX = 0;
                    entity.speedY = 0;
                    entity.animationSpeedRotation = 0;
                }
                else {
                    entity.interpolationFrames = Math.min(entity.interpolationFrames + 1, 2);
                    entity.interpolationFrames = 1;
                    entity.speedX = (data.entity[i].x - entity.x) / entity.interpolationFrames;
                    entity.speedY = (data.entity[i].y - entity.y) / entity.interpolationFrames;
                    entity.animationSpeedRotation = (data.entity[i].animationRotation - entity.animationRotation) / entity.interpolationFrames;
                }
                entity.phantomFrames = data.entity[i].phantomFrames;
                entity.dashTime = data.entity[i].dashTime;
                entity.controls = data.entity[i].controls;
                entity.collision = data.entity[i].collision;
                entity.animationFrame = data.entity[i].animationFrame;
                entity.name = data.entity[i].name;
                entity.drawName = data.entity[i].drawName;
                entity.hp = data.entity[i].hp;
                entity.hpMax = data.entity[i].hpMax;
                entity.drawHp = data.entity[i].drawHp;
                entity.updated = true;
            }
        }
        else if (data.entity[i].type == EntityType.Monster) {
            let entity = Entity.list.get(data.entity[i].id) as Monster;
            if (entity == null) {
                new Monster(data.entity[i].id, data.entity[i].x, data.entity[i].y, data.entity[i].width, data.entity[i].height, data.entity[i].phantomFrames, data.entity[i].dashTime, data.entity[i].controls, data.entity[i].collision, data.entity[i].animationFrame, data.entity[i].animationRotation, data.entity[i].hp, data.entity[i].hpMax, data.entity[i].drawHp, data.entity[i].name, data.entity[i].drawName, data.entity[i].monsterType);
            }
            else {
                if (data.entity[i].noInterpolation) {
                    entity.x = data.entity[i].x;
                    entity.y = data.entity[i].y;
                    entity.animationRotation = data.entity[i].animationRotation;
                    entity.speedX = 0;
                    entity.speedY = 0;
                    entity.animationSpeedRotation = 0;
                }
                else {
                    entity.interpolationFrames = Math.min(entity.interpolationFrames + 1, 2);
                    entity.interpolationFrames = 1;
                    entity.speedX = (data.entity[i].x - entity.x) / entity.interpolationFrames;
                    entity.speedY = (data.entity[i].y - entity.y) / entity.interpolationFrames;
                    entity.animationSpeedRotation = (data.entity[i].animationRotation - entity.animationRotation) / entity.interpolationFrames;
                }
                entity.phantomFrames = data.entity[i].phantomFrames;
                entity.dashTime = data.entity[i].dashTime;
                entity.controls = data.entity[i].controls;
                entity.collision = data.entity[i].collision;
                entity.animationFrame = data.entity[i].animationFrame;
                entity.drawName = data.entity[i].drawName;
                entity.hp = data.entity[i].hp;
                entity.hpMax = data.entity[i].hpMax;
                entity.drawHp = data.entity[i].drawHp;
                entity.updated = true;
            }
        }
        else if (data.entity[i].type == EntityType.Projectile) {
            let entity = Entity.list.get(data.entity[i].id) as Projectile;
            if (entity == null) {
                new Projectile(data.entity[i].id, data.entity[i].x, data.entity[i].y, data.entity[i].width, data.entity[i].height, data.entity[i].phantomFrames, data.entity[i].projectileType, data.entity[i].rotation);
            }
            else {
                if (data.entity[i].noInterpolation) {
                    entity.x = data.entity[i].x;
                    entity.y = data.entity[i].y;
                    entity.rotation = data.entity[i].rotation;
                    entity.speedX = 0;
                    entity.speedY = 0;
                    entity.speedRotation = 0;
                }
                else {
                    entity.interpolationFrames = Math.min(entity.interpolationFrames + 1, 2);
                    entity.interpolationFrames = 1;
                    entity.speedX = (data.entity[i].x - entity.x) / entity.interpolationFrames;
                    entity.speedY = (data.entity[i].y - entity.y) / entity.interpolationFrames;
                    let speedRotation = data.entity[i].rotation - entity.rotation;
                    if (speedRotation < -Math.PI) {
                        speedRotation += Math.PI * 2;
                    }
                    if (speedRotation > Math.PI) {
                        speedRotation -= Math.PI * 2;
                    }
                    entity.speedRotation = speedRotation / entity.interpolationFrames;
                }
                entity.phantomFrames = data.entity[i].phantomFrames;
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
    // if (data.map.updates != null) {
    //     mapRenderer.map.addUpdates(data.map.updates);
    //     mapRenderer.map.simulate();
    // }
    serverTick = data.tick;
    if (data.clientPlayer.overrideTick) {
        clientPlayer.tick = data.clientPlayer.clientTick;
    }
    clientPlayer.serverOverrides = data.clientPlayer.serverOverrides;
    if (data.clientPlayer.hp == 0 && !clientPlayer.respawning) {
        document.getElementById("respawnScreen").style.display = "revert-layer";
    }
    if (data.clientPlayer.hp > 0) {
        clientPlayer.respawning = false;
        document.getElementById("respawnScreen").style.display = "none";
    }
    if (clientPhysicsEnabled) {
        clientPlayer.width = data.clientPlayer.width;
        clientPlayer.height = data.clientPlayer.height;
        clientPlayer.collideWithEdge = data.clientPlayer.collideWithEdge;
        clientPlayer.moveType = data.clientPlayer.moveType;
        clientPlayer.moveSpeed = data.clientPlayer.moveSpeed;
        clientPlayer.jumpHeight = data.clientPlayer.jumpHeight;
        clientPlayer.stepHeight = data.clientPlayer.stepHeight;
        clientPlayer.gravity = data.clientPlayer.gravity;
        clientPlayer.friction = data.clientPlayer.friction;
        clientPlayer.airResistance = data.clientPlayer.airResistance;
        clientPlayer.controlType = data.clientPlayer.controlType;
        clientPlayer.animations = data.clientPlayer.animations;
        clientPlayer.animationSpeed = data.clientPlayer.animationSpeed;
        if (clientPlayer.weapons.length != data.clientPlayer.weapons.length) {
            clientPlayer.weapons = data.clientPlayer.weapons;
            for (let i in clientPlayer.weapons) {
                Player.prerenderWeapon(clientPlayer.weapons[i]);
            }
            initAllWeapons();
        }
        else {
            for (let i in clientPlayer.weapons) {
                if (data.clientPlayer.weapons[i].id != clientPlayer.weapons[i].id) {
                    clientPlayer.weapons[i].id = data.clientPlayer.weapons[i].id;
                    Player.prerenderWeapon(clientPlayer.weapons[i]);
                    initWeapon(Number(i));
                }
                else {
                    for (let j in data.clientPlayer.weapons[i].customizations) {
                        if (data.clientPlayer.weapons[i].customizations[j] != clientPlayer.weapons[i].customizations[j]) {
                            clientPlayer.weapons[i].customizations = data.clientPlayer.weapons[i].customizations;
                            Player.prerenderWeapon(clientPlayer.weapons[i]);
                            initWeapon(Number(i));
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
        if (data.clientPlayer.noInterpolation) {
            clientPlayer.noInterpolation = data.clientPlayer.noInterpolation;
        }
        clientPlayer.name = data.clientPlayer.name;
        // clientPlayer.teleporting = data.clientPlayer.teleporting;
        // clientPlayer.collectingPerk = data.clientPlayer.collectingPerk;
        if (data.clientPlayer.overrideClient) {
            let tick = data.clientPlayer.clientTick;
            clientPlayer.x = data.clientPlayer.x;
            clientPlayer.y = data.clientPlayer.y;
            clientPlayer.speedX = data.clientPlayer.speedX;
            clientPlayer.speedY = data.clientPlayer.speedY;
            // clientPlayer.speedX = clientPlayer.history.get(tick).speedX;
            // clientPlayer.speedY = clientPlayer.history.get(tick).speedY;
            clientPlayer.lastControls = data.clientPlayer.lastControls;
            clientPlayer.weapons = data.clientPlayer.weapons;
            for (let i in clientPlayer.weapons) {
                clientPlayer.weapons[i].ammo = data.clientPlayer.weapons[i].ammo;
                Player.prerenderWeapon(clientPlayer.weapons[i]);
            }
            clientPlayer.teleporting = data.clientPlayer.teleporting;
            clientPlayer.attackCooldown = data.clientPlayer.attackCooldown;
            clientPlayer.reloadCooldown = data.clientPlayer.reloadCooldown;
            clientPlayer.collectingPerk = data.clientPlayer.collectingPerk;
            // if (tick > clientPlayer.tick) {
            //     clientPlayer.tick = tick;
            // }
            let controls = clientPlayer.controls;
            let first = true;
            while (tick < clientPlayer.tick) {
                clientPlayer.controls = structuredClone(clientPlayer.history.get(tick).controls);
                // clientPlayer.speedX = clientPlayer.history.get(tick).speedX;
                // clientPlayer.speedY = clientPlayer.history.get(tick).speedY;
                clientPlayer.update();
                tick += 1;
                first = false;
            }
            clientPlayer.controls = controls;
        }
        clientPlayer.speedX += data.clientPlayer.serverSpeedX;
        clientPlayer.speedY += data.clientPlayer.serverSpeedY;
        clientPlayer.history.delete(data.clientPlayer.clientTick);

        let clientEntity = Entity.list.get(clientPlayer.id) as Player;
        // if (data.clientPlayer.hp > 0) {
            if (clientEntity == null) {
                clientEntity = new Player(clientPlayer.id, clientPlayer.x, clientPlayer.y, clientPlayer.width, clientPlayer.height, 1, clientPlayer.dashTime, clientPlayer.controls, data.clientPlayer.collision, { uvLookup: "player_uv_lookup", uvSource: "player_uv_source", colorLookup: clientPlayer.colorLookup }, clientPlayer.animationFrame, clientPlayer.animationRotation, data.clientPlayer.hp, data.clientPlayer.hpMax, data.clientPlayer.drawHp, data.clientPlayer.name, data.clientPlayer.drawName, clientPlayer.weapons[clientPlayer.controls.weapon]);
            }
        // }

        // while (clientPlayer.tick <= data.tick) {
        //     updateTick(false);
        // }
        // // setUpdateTickTimeout(1.5);

        // if (data.clientPlayer.hp > 0) {
        //     if (clientEntity != null) {
        //         clientEntity.speedX = (clientPlayer.x - clientEntity.x) / (60 / tps);
        //         clientEntity.speedY = (clientPlayer.y - clientEntity.y) / (60 / tps);
        //         clientEntity.interpolationFrames = 60 / tps;
        //         clientEntity.controls = clientPlayer.controls;
        //         clientEntity.animation = clientPlayer.animation;
        //         clientEntity.animationFrame = clientPlayer.animationFrame;
        //         clientEntity.weapon = clientPlayer.weapons[clientPlayer.controls.weapon];
        //         clientEntity.name = clientPlayer.name;
        //         clientEntity.updated = true;
        //     }
        // }
        // if (data.clientPlayer.hp > 0) {
            if (clientEntity != null) {
                // clientEntity.speedX = (clientPlayer.x - clientEntity.x) / (60 / tps);
                // clientEntity.speedY = (clientPlayer.y - clientEntity.y) / (60 / tps);
                // clientEntity.interpolationFrames = 60 / tps;
                // clientEntity.controls = clientPlayer.controls;
                // clientEntity.animation = clientPlayer.animation;
                // clientEntity.animationFrame = clientPlayer.animationFrame;
                // clientEntity.weapon = clientPlayer.weapons[clientPlayer.controls.weapon];
                // clientEntity.name = clientPlayer.name;
                clientEntity.updated = true;
            }
        // }
    }
    else {
        clientPlayer.x = data.clientPlayer.x;
        clientPlayer.y = data.clientPlayer.y;
        if (clientPlayer.weapons.length != data.clientPlayer.weapons.length) {
            clientPlayer.weapons = data.clientPlayer.weapons;
            for (let i in clientPlayer.weapons) {
                Player.prerenderWeapon(clientPlayer.weapons[i]);
            }
            initAllWeapons();
        }
        else {
            for (let i in clientPlayer.weapons) {
                if (data.clientPlayer.weapons[i].id != clientPlayer.weapons[i].id) {
                    clientPlayer.weapons[i].id = data.clientPlayer.weapons[i].id;
                    Player.prerenderWeapon(clientPlayer.weapons[i]);
                    initWeapon(Number(i));
                }
                else {
                    for (let j in data.clientPlayer.weapons[i].customizations) {
                        if (data.clientPlayer.weapons[i].customizations[j] != clientPlayer.weapons[i].customizations[j]) {
                            clientPlayer.weapons[i].customizations = data.clientPlayer.weapons[i].customizations;
                            Player.prerenderWeapon(clientPlayer.weapons[i]);
                            initWeapon(Number(i));
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
                clientPlayer.weapons[i].ammo = data.clientPlayer.weapons[i].ammo;
                clientPlayer.weapons[i].ammoMax = data.clientPlayer.weapons[i].ammoMax;
                clientPlayer.weapons[i].reloadSpeed = data.clientPlayer.weapons[i].reloadSpeed;
            }
        }
        clientPlayer.hp = data.clientPlayer.hp;
        clientPlayer.hpMax = data.clientPlayer.hpMax;
        clientPlayer.teleporting = data.clientPlayer.teleporting;
        clientPlayer.attackCooldown = data.clientPlayer.attackCooldown;
        clientPlayer.reloadCooldown = data.clientPlayer.reloadCooldown;
        clientPlayer.collectingPerk = data.clientPlayer.collectingPerk;
        clientPlayer.lastControls = structuredClone(clientPlayer.controls);
        if (clientPlayer.hp > 0) {
            clientPlayer.controls.left = keys.get(keybinds.left) == true;
            clientPlayer.controls.right = keys.get(keybinds.right) == true;
            clientPlayer.controls.up = keys.get(keybinds.up) == true;
            clientPlayer.controls.down = keys.get(keybinds.down) == true;
            clientPlayer.controls.attack = keys.get(keybinds.attack) == true;
            clientPlayer.controls.reload = keys.get(keybinds.reload) == true;
            clientPlayer.controls.walk = keys.get("Shift") == true || keys.get("ShiftLeft") == true || keys.get("ShiftRight") == true;
            clientPlayer.controls.angle = Math.atan2(mouseY / cameraScale - cameraY - Entity.list.get(clientPlayer.id).y - (clientPlayer.weapons[clientPlayer.controls.weapon]?.offsetY ?? 0), mouseX / cameraScale - cameraX - Entity.list.get(clientPlayer.id).x - (clientPlayer.weapons[clientPlayer.controls.weapon]?.offsetX ?? 0));
        }
        else {
            clientPlayer.controls.left = false;
            clientPlayer.controls.right = false;
            clientPlayer.controls.up = false;
            clientPlayer.controls.down = false;
            clientPlayer.controls.attack = false;
            clientPlayer.controls.reload = false;
            clientPlayer.controls.walk = false;
        }
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
            serverOverrides: clientPlayer.serverOverrides,
            controls: clientPlayer.controls,
        });
    }
    let clientEntity = Entity.list.get(clientPlayer.id) as Player;
    if (data.clientPlayer.colorLookup != null) {
        if (data.clientPlayer.colorLookup instanceof ArrayBuffer) {
            data.clientPlayer.colorLookup = new Uint8ClampedArray(data.clientPlayer.colorLookup);
        }
        clientPlayer.colorLookup = data.clientPlayer.colorLookup;
        prerenderCustomizations();
        if (clientEntity != null) {
            clientEntity.setImage({ uvLookup: "player_uv_lookup", uvSource: "player_uv_source", colorLookup: clientPlayer.colorLookup });
        }
    }
    if (clientEntity != null) {
        clientEntity.hp = data.clientPlayer.hp;
        clientEntity.hpMax = data.clientPlayer.hpMax;
    }
    // if (data.map.id != null && data.map.id != "menu") {
    //     resetCamera();
    // }
    if (data.weather != null) {
        currentWeather.cloudDensity = data.weather.cloudDensity;
        currentWeather.snowDensity = data.weather.snowDensity;
        currentWeather.windSpeedX = data.weather.windSpeedX;
        currentWeather.windSpeedY = data.weather.windSpeedY;
    }
    if (data.map.id != null) {
        resetCamera();
        initWeather();
        transitionToGame();
    }

    for (let [_, entity] of Entity.list) {
        if (!entity.updated) {
            entity.remove();
        }
    }
    // if (performance.now() - lastFrame > 10) {
    //     updateFrame();
    // }
    // window.requestAnimationFrame(updateFrame);
    // updateFrame();
    // if (!clientPhysicsEnabled && performance.now() - lastFrame > 5) {
    // if (!clientPhysicsEnabled) {
    //     updateFrame();
    // }
    while (clientPlayer.tick <= serverTick - 10) {
        updateTick(false);
    }
});
document.getElementById("respawnButton").onclick = function() {
    clientPlayer.respawning = true;
    clientPlayer.teleportSent = false;
    clientPlayer.teleportDirection = "center";
    document.getElementById("respawnScreen").style.display = "none";
    // socket.emit("respawn");
};
socket.on("teleport", (data) => {
    clientPlayer.teleportDirection = data;
    clientPlayer.teleportSent = false;
});

let lastFrame = performance.now();

let fps: number[] = [];

function updateFrame() {
    if (mapRenderer.map == null) {
        window.requestAnimationFrame(updateFrame);
        return;
    }
    
    if (clientPlayer.map != "menu" && clientPhysicsEnabled) {
        let clientEntity = Entity.list.get(clientPlayer.id) as Player;

        while (clientPlayer.tick <= serverTick - 10) {
            updateTick(false);
        }
        if (clientPlayer.tick <= serverTick + 10) {
            updateTick(false);
        }
        // setUpdateTickTimeout(1.5);

        if (clientEntity != null) {
            if (clientPlayer.noInterpolation) {
                clientEntity.x = clientPlayer.x;
                clientEntity.y = clientPlayer.y;
                clientEntity.animationRotation = clientPlayer.animationRotation;
                clientEntity.speedX = 0;
                clientEntity.speedY = 0;
                clientEntity.animationSpeedRotation = 0;
            }
            else {
                clientEntity.interpolationFrames = Math.min(clientEntity.interpolationFrames + 1, 2);
                clientEntity.interpolationFrames = 1;
                clientEntity.speedX = (clientPlayer.x - clientEntity.x) / clientEntity.interpolationFrames;
                clientEntity.speedY = (clientPlayer.y - clientEntity.y) / clientEntity.interpolationFrames;
                clientEntity.animationSpeedRotation = (clientPlayer.animationRotation - clientEntity.animationRotation) / clientEntity.interpolationFrames;
            }
            clientPlayer.noInterpolation = false;
            clientEntity.dashTime = clientPlayer.dashTime;
            clientEntity.controls = clientPlayer.controls;
            clientEntity.animationFrame = clientPlayer.animationFrame;
            clientEntity.weapon = clientPlayer.weapons[clientPlayer.controls.weapon];
            clientEntity.name = clientPlayer.name;
            clientEntity.updated = true;
        }
    }

    backgroundOffscreenCtx.clearRect(0, 0, canvas.width, canvas.height);
    belowOffscreenCtx.clearRect(0, 0, canvas.width, canvas.height);
    aboveOffscreenCtx.clearRect(0, 0, canvas.width, canvas.height);

    let frameTime = (performance.now() - lastFrame) / 1000 * 60;
    frameTime = Math.min(frameTime, 2);
    
    Entity.updateAll(frameTime);
    Particle.updateAll(frameTime);
    mapRenderer.updateAll(frameTime);

    updateWeather(frameTime);
    BackgroundEntity.updateAll(frameTime);

    updateCamera();
    if (mapRenderer instanceof WebgpuMapRenderer || mapRenderer instanceof OffscreenCanvasMapRenderer) {
        backgroundOffscreenCtx.scale(cameraScale, cameraScale);
        backgroundOffscreenCtx.translate(cameraX, cameraY);
        backgroundOffscreenCtx.drawImage(mapRenderer.backgroundCanvas, 0, 0, mapRenderer.map.width * 8, mapRenderer.map.height * 8);
        backgroundOffscreenCtx.globalCompositeOperation = "source-atop";
        backgroundOffscreenCtx.resetTransform();
    }

    BackgroundEntity.drawAll(backgroundOffscreenCtx, mapRenderer);

    backgroundOffscreenCtx.globalCompositeOperation = "destination-over";
    backgroundOffscreenCtx.fillStyle = "#000000";
    backgroundOffscreenCtx.fillRect(0, 0, canvas.width, canvas.height);
    backgroundOffscreenCtx.globalCompositeOperation = "source-over";

    backgroundOffscreenCtx.scale(cameraScale, cameraScale);
    backgroundOffscreenCtx.translate(cameraX, cameraY);
    belowOffscreenCtx.scale(cameraScale, cameraScale);
    belowOffscreenCtx.translate(cameraX, cameraY);
    aboveOffscreenCtx.scale(cameraScale, cameraScale);
    aboveOffscreenCtx.translate(cameraX, cameraY);
    
    if (mapRenderer instanceof WebgpuMapRenderer || mapRenderer instanceof OffscreenCanvasMapRenderer) {
        backgroundOffscreenCtx.globalAlpha = 0.2;
        backgroundOffscreenCtx.drawImage(mapRenderer.backgroundCanvas, 0, 0, mapRenderer.map.width * 8, mapRenderer.map.height * 8);
        backgroundOffscreenCtx.globalAlpha = 1;
    }

    // ctx.drawImage(mapRenderer.canvas, Math.max(-cameraX / 4, 0), Math.max(-cameraY / 4, 0), Math.min((-cameraX + canvas.width) / 4, mapRenderer.map.width), Math.min((-cameraY + canvas.height) / 4, mapRenderer.map.height), Math.max(-cameraX, 0), Math.max(-cameraY, 0), Math.min((-cameraX + canvas.width), mapRenderer.map.width), Math.min((-cameraY + canvas.height), mapRenderer.map.height));
    if (mapRenderer instanceof WebgpuMapRenderer) {
        // belowOffscreenCtx.drawImage(mapRenderer.canvas, 0, 0, mapRenderer.map.width * 8, mapRenderer.map.height * 8);
        // aboveOffscreenCtx.drawImage(mapRenderer.aboveCanvas, 0, 0, mapRenderer.map.width * 8, mapRenderer.map.height * 8);
        // belowOffscreenCtx.drawImage(mapRenderer.aboveCanvas, 0, 0, mapRenderer.map.width * 8, mapRenderer.map.height * 8);
        // mapRenderer.entityOcclusionCtx.clearRect(0, 0, mapRenderer.map.width * 8, mapRenderer.map.height * 8);

        // Entity.drawOcclusionAll(mapRenderer.entityOcclusionCtx);

        // mapRenderer.render(belowOffscreenCanvas);
    }
    if (mapRenderer instanceof OffscreenCanvasMapRenderer) {
        belowOffscreenCtx.drawImage(mapRenderer.canvas, 0, 0, mapRenderer.map.width * 8, mapRenderer.map.height * 8);
        mapRenderer.entityOcclusionCtx.clearRect(0, 0, mapRenderer.map.width * 8, mapRenderer.map.height * 8);

        Entity.drawOcclusionAll(mapRenderer.entityOcclusionCtx);

        mapRenderer.lightCtx.clearRect(0, 0, mapRenderer.map.width * 8, mapRenderer.map.height * 8);
        mapRenderer.entityLightCtx.clearRect(0, 0, mapRenderer.map.width * 8, mapRenderer.map.height * 8);
        // Light.drawAll(mapRenderer);
        belowOffscreenCtx.drawImage(mapRenderer.lightCanvas, 0, 0, mapRenderer.map.width * 8, mapRenderer.map.height * 8);
    }
    // if (mapRenderer instanceof WebgpuMapRenderer) {
    //     mapRenderer.render(belowOffscreenCanvas);
    //     belowOffscreenCtx.resetTransform();
    //     belowOffscreenCtx.clearRect(0, 0, canvas.width, canvas.height);
    //     belowOffscreenCtx.scale(cameraScale, cameraScale);
    //     belowOffscreenCtx.translate(cameraX, cameraY);
    //     belowOffscreenCtx.drawImage(mapRenderer.aboveCanvas, 0, 0, mapRenderer.map.width * 8, mapRenderer.map.height * 8);
    // }
    
    if (mapRenderer instanceof WebgpuMapRenderer) {
        Entity.drawAll(belowOffscreenCtx, aboveOffscreenCtx, null);
    }
    if (mapRenderer instanceof OffscreenCanvasMapRenderer) {
        Entity.drawAll(belowOffscreenCtx, aboveOffscreenCtx, mapRenderer.entityLightCanvas);
    }
    Particle.drawAll(belowOffscreenCtx, aboveOffscreenCtx);
    mapRenderer.drawAll(belowOffscreenCtx, aboveOffscreenCtx);

    backgroundOffscreenCtx.resetTransform();
    belowOffscreenCtx.resetTransform();
    aboveOffscreenCtx.resetTransform();
    
    // if (clientPlayer.teleporting || clientPlayer.respawning) {
    //     if (!clientPlayer.teleportSent) {
    //         clientPlayer.teleportSent = true;
    //         if (clientPlayer.map == "menu") {
    //             socket.emit("play");
    //         }
    //         else if (clientPlayer.respawning) {
    //             socket.emit("respawn");
    //         }
    //         else {
    //             socket.emit("teleport");
    //         }
    //     }
    // }
    if (clientPlayer.teleporting || clientPlayer.respawning) {
        clientPlayer.teleportTime = Math.min(clientPlayer.teleportTime + frameTime * 2, 60);
        if (clientPlayer.teleportTime == 60 && !clientPlayer.teleportSent) {
            clientPlayer.teleportSent = true;
            if (clientPlayer.map == "menu") {
                socket.emit("play");
            }
            else if (clientPlayer.respawning) {
                socket.emit("respawn");
            }
            else {
                socket.emit("teleport");
            }
        }
    }
    else if (clientPlayer.teleportTime > 0) {
        clientPlayer.teleportTime = Math.max(clientPlayer.teleportTime - frameTime * 2, 0);
    }
    if (clientPlayer.teleportTime > 0) {
        switch (clientPlayer.teleportDirection) {
            case "center":
                if (clientPlayer.teleportTime == 60) {
                    aboveOffscreenCtx.fillStyle = "#000000";
                    aboveOffscreenCtx.fillRect(0, 0, canvas.width, canvas.height);
                }
                else {
                    aboveOffscreenCtx.scale(cameraScale, cameraScale);
                    let distance = 0;
                    if (clientPlayer.teleporting) {
                        distance = 1 - Math.pow(clientPlayer.teleportTime / 60, 2);
                    }
                    else {
                        distance = Math.pow(1 - clientPlayer.teleportTime / 60, 2);
                    }
                    let gradient;
                    if (Entity.list.get(clientPlayer.id) != null) {
                        gradient = aboveOffscreenCtx.createRadialGradient(Math.min(Math.max(cameraX + Entity.list.get(clientPlayer.id).x, 0), canvas.width), Math.min(Math.max(cameraY + Entity.list.get(clientPlayer.id).y, 0), canvas.height), 0, Math.min(Math.max(cameraX + Entity.list.get(clientPlayer.id).x, 0), canvas.width), Math.min(Math.max(cameraY + Entity.list.get(clientPlayer.id).y, 0), canvas.height), distance * Math.sqrt(Math.pow(canvas.width, 2) + Math.pow(canvas.height, 2)) / cameraScale);
                    }
                    else {
                        gradient = aboveOffscreenCtx.createRadialGradient(Math.min(Math.max(cameraX + clientPlayer.x, 0), canvas.width), Math.min(Math.max(cameraY + clientPlayer.y, 0), canvas.height), 0, Math.min(Math.max(cameraX + clientPlayer.x, 0), canvas.width), Math.min(Math.max(cameraY + clientPlayer.y, 0), canvas.height), distance * Math.sqrt(Math.pow(canvas.width, 2) + Math.pow(canvas.height, 2)) / cameraScale);
                    }
                    gradient.addColorStop(0, "#00000000");
                    gradient.addColorStop(1, "#00000000");
                    gradient.addColorStop(1, "#000000");
                    aboveOffscreenCtx.fillStyle = gradient;
                    aboveOffscreenCtx.fillRect(0, 0, canvas.width / cameraScale, canvas.height / cameraScale);
                    aboveOffscreenCtx.fillStyle = "rgba(0, 0, 0, " + clientPlayer.teleportTime / 60 + ")";
                    aboveOffscreenCtx.fillRect(0, 0, canvas.width / cameraScale, canvas.height / cameraScale);
                    aboveOffscreenCtx.resetTransform();
                }
                break;
            case "left": {
                let size = 1 - Math.sin((60 - clientPlayer.teleportTime) / 60 * Math.PI / 2);
                if (clientPlayer.teleporting) {
                    aboveOffscreenCtx.fillStyle = "#000000";
                    aboveOffscreenCtx.fillRect(0, 0, canvas.width * size, canvas.height);
                }
                else {
                    aboveOffscreenCtx.fillStyle = "#000000";
                    aboveOffscreenCtx.fillRect(canvas.width * (1 - size), 0, canvas.width * size, canvas.height);
                }
                break;
            }
            case "right": {
                let size = 1 - Math.sin((60 - clientPlayer.teleportTime) / 60 * Math.PI / 2);
                if (clientPlayer.teleporting) {
                    aboveOffscreenCtx.fillStyle = "#000000";
                    aboveOffscreenCtx.fillRect(canvas.width * (1 - size), 0, canvas.width * size, canvas.height);
                }
                else {
                    aboveOffscreenCtx.fillStyle = "#000000";
                    aboveOffscreenCtx.fillRect(0, 0, canvas.width * size, canvas.height);
                }
                break;
            }
            case "up": {
                let size = 1 - Math.sin((60 - clientPlayer.teleportTime) / 60 * Math.PI / 2);
                if (clientPlayer.teleporting) {
                    aboveOffscreenCtx.fillStyle = "#000000";
                    aboveOffscreenCtx.fillRect(0, 0, canvas.width, canvas.height * size);
                }
                else {
                    aboveOffscreenCtx.fillStyle = "#000000";
                    aboveOffscreenCtx.fillRect(0, canvas.height * (1 - size), canvas.width, canvas.height * size);
                }
                break;
            }
            case "down": {
                let size = 1 - Math.sin((60 - clientPlayer.teleportTime) / 60 * Math.PI / 2);
                if (clientPlayer.teleporting) {
                    aboveOffscreenCtx.fillStyle = "#000000";
                    aboveOffscreenCtx.fillRect(0, canvas.height * (1 - size), canvas.width, canvas.height * size);
                }
                else {
                    aboveOffscreenCtx.fillStyle = "#000000";
                    aboveOffscreenCtx.fillRect(0, 0, canvas.width, canvas.height * size);
                }
                break;
            }
        }
    }
    // aboveOffscreenCtx.scale(cameraScale, cameraScale);
    // let gradient;
    // if (Entity.list.get(clientPlayer.id) != null) {
    //     gradient = aboveOffscreenCtx.createRadialGradient(Math.min(Math.max(cameraX + Entity.list.get(clientPlayer.id).x, 0), canvas.width), Math.min(Math.max(cameraY + Entity.list.get(clientPlayer.id).y, 0), canvas.height), 0, Math.min(Math.max(cameraX + Entity.list.get(clientPlayer.id).x, 0), canvas.width), Math.min(Math.max(cameraY + Entity.list.get(clientPlayer.id).y, 0), canvas.height), distance * Math.sqrt(Math.pow(canvas.width, 2) + Math.pow(canvas.height, 2)) / cameraScale);
    // }
    // else {
    //     gradient = aboveOffscreenCtx.createRadialGradient(Math.min(Math.max(cameraX + clientPlayer.x, 0), canvas.width), Math.min(Math.max(cameraY + clientPlayer.y, 0), canvas.height), 0, Math.min(Math.max(cameraX + clientPlayer.x, 0), canvas.width), Math.min(Math.max(cameraY + clientPlayer.y, 0), canvas.height), distance * Math.sqrt(Math.pow(canvas.width, 2) + Math.pow(canvas.height, 2)) / cameraScale);
    // }
    // gradient.addColorStop(0, "#00000000");
    // gradient.addColorStop(1, "#000000");
    // aboveOffscreenCtx.fillStyle = gradient;
    // aboveOffscreenCtx.fillRect(0, 0, canvas.width / cameraScale, canvas.height / cameraScale);
    // aboveOffscreenCtx.resetTransform();

    if (clientPlayer.map != "menu") {
        fps.push(performance.now());
        while (performance.now() - fps[0] > 1000) {
            fps.shift();
        }

        drawHud(aboveOffscreenCtx);
        updateHud();
        drawCustomizations();

        tickGraph.update(performance.now() - lastFrame);
    }
    if (mapRenderer instanceof WebgpuMapRenderer) {
        mapRenderer.render(backgroundOffscreenCanvas, belowOffscreenCanvas);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // ctx.drawImage(belowOffscreenCanvas, 0, 0);
        ctx.drawImage(aboveOffscreenCanvas, 0, 0);
    }
    if (mapRenderer instanceof OffscreenCanvasMapRenderer) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(backgroundOffscreenCanvas, 0, 0);
        ctx.drawImage(belowOffscreenCanvas, 0, 0);
        ctx.drawImage(aboveOffscreenCanvas, 0, 0);
    }
    lastFrame = performance.now();
    // if (clientPhysicsEnabled || clientPlayer.map == "menu") {
    window.requestAnimationFrame(updateFrame);
    // }
};
window.requestAnimationFrame(updateFrame);

function updateTick(drawFrame: boolean) {
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
    if (clientPlayer.hp > 0) {
        clientPlayer.controls.left = keys.get(keybinds.left) == true;
        clientPlayer.controls.right = keys.get(keybinds.right) == true;
        clientPlayer.controls.up = keys.get(keybinds.up) == true;
        clientPlayer.controls.down = keys.get(keybinds.down) == true;
        clientPlayer.controls.attack = keys.get(keybinds.attack) == true;
        clientPlayer.controls.reload = keys.get(keybinds.reload) == true;
        clientPlayer.controls.walk = keys.get("Shift") == true || keys.get("ShiftLeft") == true || keys.get("ShiftRight") == true;
        clientPlayer.controls.angle = Math.atan2(mouseY / cameraScale - cameraY - Entity.list.get(clientPlayer.id).y - (clientPlayer.weapons[clientPlayer.controls.weapon]?.offsetY ?? 0), mouseX / cameraScale - cameraX - Entity.list.get(clientPlayer.id).x - (clientPlayer.weapons[clientPlayer.controls.weapon]?.offsetX ?? 0));
    }
    else {
        clientPlayer.controls.left = false;
        clientPlayer.controls.right = false;
        clientPlayer.controls.up = false;
        clientPlayer.controls.down = false;
        clientPlayer.controls.attack = false;
        clientPlayer.controls.reload = false;
        clientPlayer.controls.walk = false;
    }
    clientPlayer.history.set(clientPlayer.tick, structuredClone({
        speedX: clientPlayer.speedX,
        speedY: clientPlayer.speedY,
        controls: clientPlayer.controls,
    }));
    clientPlayer.update();
    // if (clientPlayer.dead) {
    //     socket.emit("updateTick", {
    //         tick: clientPlayer.tick,
    //     });
    // }
    // else {
    let weapons = [];
    for (let i in clientPlayer.weapons) {
        weapons.push({
            ammo: clientPlayer.weapons[i].ammo,
        });
    }
    socket.emit("updateTick", structuredClone({
        tick: clientPlayer.tick,
        serverOverrides: clientPlayer.serverOverrides,
        x: clientPlayer.x,
        y: clientPlayer.y,
        speedX: clientPlayer.speedX,
        speedY: clientPlayer.speedY,
        controls: clientPlayer.controls,
        weapons: weapons,
    }));
    // }
    if (drawFrame) {
        let clientEntity = Entity.list.get(clientPlayer.id) as Player;
        if (clientEntity != null) {
            clientEntity.interpolationFrames = Math.min(clientEntity.interpolationFrames + 1, 2);
            clientEntity.interpolationFrames = 1;
            clientEntity.speedX = (clientPlayer.x - clientEntity.x) / clientEntity.interpolationFrames;
            clientEntity.speedY = (clientPlayer.y - clientEntity.y) / clientEntity.interpolationFrames;
            clientEntity.dashTime = clientPlayer.dashTime;
            clientEntity.controls = clientPlayer.controls;
            clientEntity.animationFrame = clientPlayer.animationFrame;
            clientEntity.animationSpeedRotation = (clientPlayer.animationRotation - clientEntity.animationRotation) / clientEntity.interpolationFrames;
            clientEntity.weapon = clientPlayer.weapons[clientPlayer.controls.weapon];
            clientEntity.name = clientPlayer.name;
            clientEntity.updated = true;
        }
        // updateFrame();
    }
    clientPlayer.tick += 1;
    // setTimeout(updateTick, 1000 / tps);
    // if (drawFrame) {
    //     setUpdateTickTimeout(1);
    // }
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