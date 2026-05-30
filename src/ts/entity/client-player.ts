import { Weapon } from "./player.js";
import { Controls, Rig } from "./rig.js";
import { CollectiblePerk, Collision, CollisionType, SimulatedMap, StaticMap, Teleporter } from "../map/map.js";
import { Pixel, pixels, State } from "../map/pixels.js";
import { WeaponItem } from "../ui/item.js";
import { unlockedPerks } from "../ui/perks.js";
import { socket } from "../../index.js";

interface Animation {
    conditions: string[],
    startFrame: number,
    frames: number,
    patterns: string[],
}

let clientPlayer: {
    id: number,
    random: Function,
    tick: number,
    serverOverrides: number,
    noInterpolation: boolean,
    x: number,
    y: number,
    speedX: number,
    speedY: number,
    width: number,
    height: number,
    map: string,
    collideWithEdge: boolean,
    moveType: string,
    moveSpeed: number,
    jumpHeight: number,
    stepHeight: number,
    gravity: number,
    friction: number,
    airResistance: number,
    onGround: number,
    airControl: boolean,
    canDash: boolean,
    dashTime: number,
    dashSpeedX: number,
    dashSpeedY: number,
    controlType: string,
    controls: Controls,
    lastControls: Controls,
    history: Map<number, {
        speedX: number,
        speedY: number,
        controls: Controls,
    }>,
    colorLookup: string | Uint8ClampedArray,
    animations: Animation[],
    animationFrame: number,
    animationRotation: number,
    animationSpeed: number,
    weapons: Weapon[],
    attackCooldown: number,
    reloadCooldown: number,
    hp: number,
    hpMax: number,
    name: string,
    respawning: boolean,
    teleporting: boolean,
    teleportTime: number,
    teleportDirection: string,
    teleportSent: boolean,
    collectingPerk: CollectiblePerk,
    collectingPerkTime: number,
    builds: {
        id: string,
        customizations: {
            [key: string]: string,
        },
    }[][],
    currentBuild: number,
    update: Function,
    updateMovement: Function,
    updateAnimation: Function,
    updateAttack: Function,
    updateWeapon: Function,
    move: Function,
    isCollidingWithCollision: Function,
    collideWithCollision: Function,
    isCollidingWithMap: Function,
    collideWithMap: Function,
    getMapFriction: Function,
    isCollidingWithMapLiquid: Function,
    isCollidingWithTeleporter: Function,
    collideWithTeleporter: Function,
    isCollidingWithCollectiblePerk: Function,
    collideWithCollectiblePerk: Function,
} = {
    id: null,
    random: null,
    tick: 0,
    serverOverrides: 0,
    noInterpolation: true,
    x: 0,
    y: 0,
    speedX: 0,
    speedY: 0,
    width: 0,
    height: 0,
    map: null,
    collideWithEdge: true,
    moveType: "grounded",
    moveSpeed: 0,
    jumpHeight: 0,
    stepHeight: 0,
    gravity: 0,
    friction: 0,
    airResistance: 0,
    onGround: 0,
    airControl: true,
    canDash: false,
    dashTime: 0,
    dashSpeedX: 0,
    dashSpeedY: 0,
    controlType: "controls",
    controls: {
        left: false,
        right: false,
        up: false,
        down: false,
        attack: false,
        reload: false,
        walk: false,
        angle: 0,
        weapon: -1,
    },
    lastControls: {
        left: false,
        right: false,
        up: false,
        down: false,
        attack: false,
        reload: false,
        walk: false,
        angle: 0,
        weapon: -1,
    },
    history: new Map(),
    colorLookup: null,
    animations: [],
    animationFrame: 0,
    animationRotation: 0,
    animationSpeed: 0,
    weapons: [],
    attackCooldown: 0,
    reloadCooldown: 0,
    hp: 0,
    hpMax: 0,
    name: null,
    respawning: false,
    teleporting: false,
    teleportTime: 0,
    teleportDirection: "center",
    teleportSent: false,
    collectingPerk: null,
    collectingPerkTime: 0,
    builds: [],
    currentBuild: 0,
    update: function() {
        if (this.collectingPerk != null) {
            this.x += (this.collectingPerk.x - this.x) * 0.1;
            this.y += (this.collectingPerk.y - this.y) * 0.1;
            this.collectingPerkTime += 1;
            if (this.collectingPerkTime >= 240) {
                socket.emit("collectPerk");
            }
            return;
        }
        this.collectingPerkTime = 0;
        if (this.controls.weapon != this.lastControls.weapon) {
            this.updateWeapon();
        }
        this.updateMovement();
        this.updateAnimation();
        this.updateAttack();
        if (!this.teleporting) {
            this.collideWithTeleporter();
        }
        this.collideWithCollectiblePerk();
    },
    updateMovement: function() {
        switch (this.moveType) {
            case "static":
                break;
            case "grounded": {
                let liquid = this.isCollidingWithMapLiquid() / this.width / this.height;
                this.speedY += this.gravity;
                this.speedY -= this.gravity * liquid * 2;
                this.speedY *= 1 - liquid * 0.05;
                this.speedX *= 1 - liquid * 0.05;
                this.speedY *= 1 - this.airResistance;
                this.speedX *= 1 - this.airResistance;

                switch (this.controlType) {
                    case "none": {
                        let moveSpeed = (this.controls.walk ? 0.25 : 1) * this.moveSpeed;

                        let grounded = false;
                        let friction = 0;
                        let lastY = this.y;
                        this.y += 1e-5;
                        if (this.isCollidingWithMap(this.x, lastY)) {
                            grounded = true;
                            friction = this.getMapFriction(this.x, lastY);
                        }
                        this.y = lastY;

                        if (grounded) {
                            this.speedX *= Math.pow(1 - this.friction, friction);
                        }
                        if (grounded && Math.abs(this.speedX) > moveSpeed) {
                            if (this.speedY == 0) {
                                this.speedX += (moveSpeed - Math.abs(this.speedX)) * Math.sign(this.speedX) * 0.1;
                            }
                            else {
                                this.speedX += (moveSpeed - Math.abs(this.speedX)) * Math.sign(this.speedX) * (0.1 + Math.exp(-1 / Math.pow(this.speedY * 4, 2)) * 0.9);
                            }
                        }
                        break;
                    }
                    case "controls": {
                        // let moveSpeed = (this.controls.walk ? 0.25 : 1) * this.moveSpeed;

                        // let grounded = false;
                        // let friction = 0;
                        // let wallJumpDirection = 0;
                        // let lastY = this.y;
                        // this.y += 1e-5;
                        // if (this.isCollidingWithMap(this.x, lastY)) {
                        //     grounded = true;
                        //     friction = this.getMapFriction(this.x, lastY);
                        // }
                        // this.y = lastY;
                        // if (!grounded && this.speedY > 0) {
                        //     if (this.controls.left) {
                        //         let lastX = this.x;
                        //         this.x -= 1e-5;
                        //         if (this.isCollidingWithMap(lastX, this.y)) {
                        //             // grounded = true;
                        //             wallJumpDirection -= 1;
                        //         }
                        //         this.x = lastX;
                        //     }
                        //     if (this.controls.right) {
                        //         let lastX = this.x;
                        //         this.x += 1e-5;
                        //         if (this.isCollidingWithMap(lastX, this.y)) {
                        //             // grounded = true;
                        //             wallJumpDirection += 1;
                        //         }
                        //         this.x = lastX;
                        //     }
                        // }

                        // if (grounded && !this.controls.left && !this.controls.right) {
                        //     this.speedX *= Math.pow(1 - this.friction, friction);
                        // }
                        // if (grounded && Math.abs(this.speedX) > moveSpeed) {
                        //     if (this.speedY == 0) {
                        //         this.speedX += (moveSpeed - Math.abs(this.speedX)) * Math.sign(this.speedX) * 0.1;
                        //     }
                        //     else {
                        //         this.speedX += (moveSpeed - Math.abs(this.speedX)) * Math.sign(this.speedX) * (0.1 + Math.exp(-1 / Math.pow(this.speedY * 4, 2)) * 0.9);
                        //     }
                        // }
                        // if (this.controls.left) {
                        //     this.speedX += Math.min((-moveSpeed - this.speedX) * 0.1, 0);
                        //     if (wallJumpDirection == -1) {
                        //         // this.speedY /= 2;
                        //     }
                        // }
                        // if (this.controls.right) {
                        //     this.speedX += Math.max((moveSpeed - this.speedX) * 0.1, 0);
                        //     if (wallJumpDirection == 1) {
                        //         // this.speedY /= 2;
                        //     }
                        // }
                        // if (this.controls.up && (grounded || this.onGround > 0)) {
                        //     // this.speedX -= wallJumpDirection * Math.sqrt(2 * this.jumpHeight * this.gravity);
                        //     this.speedY = -Math.sqrt(2 * this.jumpHeight * this.gravity);
                        //     this.animationFrame = 0;
                        //     this.onGround = 0;
                        // }
                        // // if (this.controls.down) {
                        // //     this.speedY += this.moveSpeed;
                        // // }


                        
                        let moveSpeed = (this.controls.walk ? 0.25 : 1) * this.moveSpeed;

                        let grounded = false;
                        let friction = 0;
                        let wallJumpDirection = 0;
                        let lastY = this.y;
                        this.y += 1e-5;
                        if (this.isCollidingWithMap(this.x, lastY)) {
                            grounded = true;
                            friction = this.getMapFriction(this.x, lastY);
                        }
                        this.y = lastY;
                        // if (!grounded && this.speedY > 0) {
                        //     if (this.controls.left) {
                        //         let lastX = this.x;
                        //         this.x -= 1e-5;
                        //         if (this.isCollidingWithMapWall(lastX, this.y)) {
                        //             grounded = true;
                        //             wallJumpDirection -= 1;
                        //         }
                        //         this.x = lastX;
                        //     }
                        //     if (this.controls.right) {
                        //         let lastX = this.x;
                        //         this.x += 1e-5;
                        //         if (this.isCollidingWithMapWall(lastX, this.y)) {
                        //             grounded = true;
                        //             wallJumpDirection += 1;
                        //         }
                        //         this.x = lastX;
                        //     }
                        // }

                        if (Math.abs(this.speedX) > this.moveSpeed) {
                            this.airControl = false;
                        }
                        if (grounded) {
                            this.airControl = true;
                        }

                        if (grounded && !this.controls.left && !this.controls.right) {
                            this.speedX *= Math.pow(1 - this.friction, friction);
                        }
                        else if (this.airControl && !this.controls.left && !this.controls.right) {
                            this.speedX *= 0.9;
                        }
                        if (grounded && Math.abs(this.speedX) > moveSpeed) {
                            if (this.speedY == 0) {
                                this.speedX += (moveSpeed - Math.abs(this.speedX)) * Math.sign(this.speedX) * 0.1;
                            }
                            else {
                                this.speedX += (moveSpeed - Math.abs(this.speedX)) * Math.sign(this.speedX) * (0.1 + Math.exp(-1 / Math.pow(this.speedY * 4, 2)) * 0.9);
                            }
                        }
                        if (this.controls.left) {
                            this.speedX += Math.min((-moveSpeed - this.speedX) * 0.1, 0);
                            // if (wallJumpDirection == -1) {
                            //     this.speedY /= 2;
                            // }
                        }
                        if (this.controls.right) {
                            this.speedX += Math.max((moveSpeed - this.speedX) * 0.1, 0);
                            // if (wallJumpDirection == 1) {
                            //     this.speedY /= 2;
                            // }
                        }
                        if (grounded) {
                            this.canDash = true;
                        }
                        if (this.controls.up && (grounded || this.onGround > 0)) {
                            // this.speedX -= wallJumpDirection * Math.sqrt(2 * this.jumpHeight * this.gravity);
                            this.speedY = -Math.sqrt(2 * this.jumpHeight * this.gravity);
                            this.animationFrame = 0;
                            this.onGround = 0;
                        }
                        else if (this.controls.up && !this.lastControls.up && !grounded && this.onGround <= 0 && this.canDash) {
                            this.dashTime = 6;
                            this.dashSpeedX = this.controls.left ? -1 : this.controls.right ? 1 : 0;
                            this.dashSpeedY = -1 * (this.dashSpeedX == 0 ? 1 : 1 / Math.sqrt(2));
                            this.canDash = false;
                            // this.speedX = this.dashSpeedX * 8;
                            // this.speedY = this.dashSpeedY * 8;
                        }
                        else if (this.controls.down && !this.lastControls.down && !grounded && this.onGround <= 0 && this.canDash) {
                            this.dashTime = 6;
                            this.dashSpeedX = this.controls.left ? -1 : this.controls.right ? 1 : 0;
                            this.dashSpeedY = 1 * (this.dashSpeedX == 0 ? 1 : 1 / Math.sqrt(2));
                            this.canDash = false;
                        }
                        if (this.dashTime != 0) {
                            this.dashTime -= 1;
                            this.speedX = this.dashSpeedX * 4;
                            this.speedY = this.dashSpeedY * 4;
                            // this.speedX += this.dashSpeedX * 6 * 0.1;
                            // this.speedY += this.dashSpeedY * 6 * 0.1;
                        }
                        // if (this.controls.up && !this.canDash) {
                        //     this.speedY *= 0.6;
                        // }
                        // if (this.controls.down) {
                        //     this.speedY += this.moveSpeed;
                        // }
                        break;
                    }
                }
                this.onGround -= 1;
                break;
            }
            case "flying": {
                let liquid = this.isCollidingWithMapLiquid() / this.width / this.height;
                this.speedY += this.gravity;
                this.speedY -= this.gravity * liquid * 2;
                this.speedY *= 1 - liquid * 0.05;
                this.speedX *= 1 - liquid * 0.05;
                this.speedY *= 1 - this.airResistance;
                this.speedX *= 1 - this.airResistance;

                switch (this.controlType) {
                    case "none":
                        break;
                    case "controls":
                        let moveSpeed = (this.controls.walk ? 0.25 : 1) * this.moveSpeed;
                        if (!this.controls.left && !this.controls.right) {
                            this.speedX *= 1 - this.friction;
                        }
                        if (!this.controls.up && !this.controls.down) {
                            this.speedY *= 1 - this.friction;
                        }
                        if (Math.abs(this.speedX) > moveSpeed) {
                            this.speedX += (moveSpeed - Math.abs(this.speedX)) * Math.sign(this.speedX) * 0.1;
                        }
                        if (Math.abs(this.speedY) > moveSpeed) {
                            this.speedY += (moveSpeed - Math.abs(this.speedY)) * Math.sign(this.speedY) * 0.1;
                        }
                        if (this.controls.left) {
                            this.speedX += Math.min((-moveSpeed - this.speedX) * 0.1, 0);
                        }
                        if (this.controls.right) {
                            this.speedX += Math.max((moveSpeed - this.speedX) * 0.1, 0);
                        }
                        if (this.controls.up) {
                            this.speedY += Math.min((-moveSpeed - this.speedY) * 0.1, 0);
                        }
                        if (this.controls.down) {
                            this.speedY += Math.max((moveSpeed - this.speedY) * 0.1, 0);
                        }
                        break;
                }
                break;
            }
        }
        this.lastControls = structuredClone(this.controls);
        this.move();
    },
    updateAnimation: function() {
        let grounded = false;
        let lastY = this.y;
        this.y += 1e-5;
        if (this.isCollidingWithMap(this.x, lastY)) {
            grounded = true;
        }
        this.y = lastY;

        for (let i in this.animations) {
            let satisfied = true;
            for (let j in this.animations[i].conditions) {
                switch (this.animations[i].conditions[j]) {
                    case "move_left":
                        satisfied &&= this.speedX < 0;
                        break;
                    case "move_right":
                        satisfied &&= this.speedX >= 0;
                        break;
                    case "face_left":
                        satisfied &&= Math.abs(this.controls.angle) > Math.PI / 2;
                        break;
                    case "face_right":
                        satisfied &&= Math.abs(this.controls.angle) <= Math.PI / 2;
                        break;
                    case "walk":
                        satisfied &&= Math.abs(this.speedX) >= this.moveSpeed * 0.1;
                        break;
                    case "run":
                        satisfied &&= Math.abs(this.speedX) >= this.moveSpeed * 0.5;
                        break;
                    case "fly":
                        satisfied &&= !grounded;
                        break;
                    case "attacking":
                        satisfied &&= this.controls.attack && this.controls.weapon != -1 && this.weapons[this.controls.weapon].ammo > 0;
                        break;
                    case "dead":
                        satisfied &&= this.hp == 0;
                        break;
                }
            }
            if (!satisfied) {
                continue;
            }
            for (let j in this.animations[i].patterns) {
                let frame = this.animationFrame - this.animations[i].startFrame;
                switch (this.animations[i].patterns[j]) {
                    case "static":
                        this.animationFrame = this.animations[i].startFrame;
                        break;
                    case "loop":
                        if (this.animationFrame < this.animations[i].startFrame || this.animationFrame >= this.animations[i].startFrame + this.animations[i].frames) {
                            this.animationFrame = this.animations[i].startFrame;
                            break;
                        }
                        this.animationFrame = (frame + this.animationSpeed) % this.animations[i].frames + this.animations[i].startFrame;
                        break;
                    case "run":
                        if (this.animationFrame < this.animations[i].startFrame || this.animationFrame >= this.animations[i].startFrame + this.animations[i].frames) {
                            this.animationFrame = this.animations[i].startFrame;
                            break;
                        }
                        this.animationFrame = (frame + this.animationSpeed * Math.min(Math.abs(this.speedX), this.moveSpeed)) % this.animations[i].frames + this.animations[i].startFrame;
                        break;
                    case "run_reverse":
                        if (this.animationFrame < this.animations[i].startFrame || this.animationFrame >= this.animations[i].startFrame + this.animations[i].frames) {
                            this.animationFrame = this.animations[i].startFrame;
                            break;
                        }
                        this.animationFrame = (frame + this.animations[i].frames - this.animationSpeed * Math.min(Math.abs(this.speedX), this.moveSpeed)) % this.animations[i].frames + this.animations[i].startFrame;
                        break;
                    case "run_directional":
                        if (this.animationFrame < this.animations[i].startFrame || this.animationFrame >= this.animations[i].startFrame + this.animations[i].frames) {
                            this.animationFrame = this.animations[i].startFrame;
                            break;
                        }
                        let speed = this.animationSpeed * Math.min(Math.abs(this.speedX), this.moveSpeed);
                        if ((Math.abs(this.controls.angle) > Math.PI / 2) != (this.speedX < 0)) {
                            speed = this.animations[i].frames - speed;
                        }
                        this.animationFrame = (frame + speed) % this.animations[i].frames + this.animations[i].startFrame;
                        break;
                    case "jump":
                        let jumpSpeed = -Math.sqrt(2 * this.jumpHeight * this.gravity);
                        if (this.speedY <= jumpSpeed / 2) {
                            this.animationFrame = this.animations[i].startFrame;
                        }
                        else if (this.speedY <= 0) {
                            this.animationFrame = this.animations[i].startFrame + Math.min(1, this.animations[i].frames - 1);
                        }
                        else if (this.speedY <= -jumpSpeed / 2) {
                            this.animationFrame = this.animations[i].startFrame + Math.min(2, this.animations[i].frames - 1);
                        }
                        else {
                            this.animationFrame = this.animations[i].startFrame + Math.min(3, this.animations[i].frames - 1);
                        }
                        break;
                    case "static_rotation":
                        this.animationRotation = 0;
                        break;
                    case "rotate_x":
                        this.animationRotation += this.speedX / (this.width / 2);
                        break;
                    case "rotate_y":
                        this.animationRotation += this.speedY / (this.height / 2);
                        break;
                }
            }
            break;
        }
    },
    updateAttack: function() {
        let weapon = this.weapons[this.controls.weapon];
        if (weapon == null) {
            return;
        }
        weapon.animationFrame -= 1;
        if (this.controls.reload && this.reloadCooldown <= 0) {
            weapon.ammo = 0;
            this.attackCooldown = 0;
            this.reloadCooldown = weapon.reloadSpeed;
        }
        if (weapon.ammo == 0 && this.reloadCooldown <= 0) {
            this.attackCooldown = 0;
            this.reloadCooldown = weapon.reloadSpeed;
        }
        if (this.reloadCooldown > 0) {
            this.reloadCooldown -= 1;
            if (this.reloadCooldown <= 0) {
                weapon.ammo = weapon.ammoMax;
            }
            else {
                return;
            }
        }
        this.attackCooldown -= 1;
        if (this.controls.attack && this.attackCooldown <= 0 && this.controlType == "controls") {
            for (let i = 0; i < weapon.projectileCount; i++) {
                if (WeaponItem.data[weapon.id].projectile != null) {
                    let angle = this.controls.angle + (this.random() * 2 - 1) * weapon.projectileSpread;
                    // new Projectile(WeaponItem.data[weapon.id].projectile, this.x + weapon.offsetX, this.y + weapon.offsetY, this.speedX + weapon.projectileSpeed * Math.cos(angle), this.speedY + weapon.projectileSpeed * Math.sin(angle), this.map, angle, 60 * 60, weapon.damage, weapon.critDamage, weapon.knockback, weapon.piercing, this);
                    this.speedX += -weapon.projectileSpeed * weapon.recoil * Math.cos(angle);
                    this.speedY += -weapon.projectileSpeed * weapon.recoil * Math.sin(angle);
                }
                else if (WeaponItem.data[weapon.id].projectiles != null) {
                    let totalWeight = 0;
                    for (let j in WeaponItem.data[weapon.id].projectiles) {
                        totalWeight += WeaponItem.data[weapon.id].projectiles[j].weight;
                    }
                    let random = this.random() * totalWeight;
                    for (let j in WeaponItem.data[weapon.id].projectiles) {
                        let projectileData = WeaponItem.data[weapon.id].projectiles[j];
                        random -= projectileData.weight;
                        if (random <= 0) {
                            for (let k = 0; k < projectileData.projectileCount; k++) {
                                let angle = this.controls.angle + (this.random() * 2 - 1) * weapon.projectileSpread * projectileData.projectileSpread;
                                // new Projectile(j, this.x + weapon.offsetX, this.y + weapon.offsetY, this.speedX + weapon.projectileSpeed * projectileData.projectileSpeed * Math.cos(angle), this.speedY + weapon.projectileSpeed * projectileData.projectileSpeed * Math.sin(angle), this.map, angle, 60 * 60, weapon.damage * projectileData.damage, weapon.critDamage * projectileData.critDamage, weapon.knockback * projectileData.knockback, weapon.piercing * projectileData.piercing, this);
                                this.speedX += -weapon.projectileSpeed * projectileData.projectileSpeed * weapon.recoil * projectileData.recoil * Math.cos(angle);
                                this.speedY += -weapon.projectileSpeed * projectileData.projectileSpeed * weapon.recoil * projectileData.recoil * Math.sin(angle);
                            }
                            break;
                        }
                    }
                }
            }
            weapon.animationFrame = weapon.attackSpeed;
            weapon.ammo -= 1;
            if (weapon.ammo == 0) {
                this.reloadCooldown = weapon.reloadSpeed;
                return;
            }
            this.attackCooldown = weapon.attackSpeed;
        }
    },
    updateWeapon: function() {
        let weapon = this.weapons[this.controls.weapon];
        if (weapon != null) {
            if (weapon.ammo == 0) {
                this.attackCooldown = 0;
                this.reloadCooldown = weapon.reloadSpeed;
            }
            else {
                this.attackCooldown = weapon.attackSpeed;
                this.reloadCooldown = 0;
            }
        }
        let lastWeapon = this.weapons[this.lastControls.weapon];
        if (lastWeapon != null) {
            lastWeapon.animationFrame = 0;
        }
    },
    move: function() {
        let timeRemaining = 1;
        let times = 0;
        // let liquid = this.isCollidingWithMapLiquid() / this.width / this.height;
        while (timeRemaining > 0) {
            // let planeX = Math.max(Math.sign(this.speedX), -1e-10);
            // let planeY = Math.max(Math.sign(this.speedY), -1e-10);
            let planeX = Math.max(Math.sign(this.speedX), 0);
            let planeY = Math.max(Math.sign(this.speedY), 0);
            // let planeX = Math.sign(this.speedX);
            // let planeY = Math.sign(this.speedY);
            let inverseSpeedX = 1 / this.speedX;
            let inverseSpeedY = 1 / this.speedY;
            let frontX = this.x + this.width / 2 * Math.sign(this.speedX);
            let frontY = this.y + this.height / 2 * Math.sign(this.speedY);
            let distanceX = (planeX - (frontX - Math.floor(frontX)));
            let distanceY = (planeY - (frontY - Math.floor(frontY)));
            if (distanceX == 0) {
                distanceX = Math.sign(this.speedX);
            }
            if (distanceY == 0) {
                distanceY = Math.sign(this.speedY);
            }
            let timeX = distanceX * inverseSpeedX;
            let timeY = distanceY * inverseSpeedY;

            if (!isFinite(timeX)) {
                timeX = Infinity;
            }
            if (!isFinite(timeY)) {
                timeY = Infinity;
            }
            
            let lastX = this.x;
            let lastY = this.y;
            
            let time = Math.min(Math.min(timeX, timeY), timeRemaining);

            this.x += this.speedX * time;
            this.y += this.speedY * time;
            timeRemaining -= time;
            times += 1;
            if (times > 1000) {
                console.warn("moved >1000 times!")
                break;
            }
            this.collideWithMap(lastX, lastY);

            if (this.isCollidingWithMap(lastX, lastY)) {
                this.x = lastX;
                this.y = lastY;
            }

            // collide: if (this.isCollidingWithNewMap(lastX, lastY)) {
            //     let stepLastY = this.y;
            //     for (let i = 0; i <= this.stepHeight; i++) {
            //         this.y = Math.ceil(lastY + this.height / 2 - i) - this.height / 2;
            //         // this.y = lastY - i;
            //         // if (this.y - this.height / 2 <= 0) {
            //         //     this.y = this.height / 2;
            //         // }
            //         if (!this.isCollidingWithNewMap(lastX, lastY)) {
            //             // this.y = Math.ceil(this.y + this.height / 2) - this.height / 2;
            //             speedY = 0;
            //             this.speedY = 0;
            //             break collide;
            //         }
            //     }
            //     this.y = stepLastY;

            //     let nextX = this.x;
            //     this.x = lastX;
            //     if (this.isCollidingWithNewMap(lastX, lastY)) {
            //         this.x = nextX;
            //         this.y = lastY;
            //         speedY = 0;
            //         this.speedY = 0;
            //         if (this.isCollidingWithNewMap(lastX, lastY)) {
            //             this.x = lastX;
            //             speedX = 0;
            //             this.speedX = 0;
            //         }
            //     }
            //     else {
            //         if (this.speedY > 0 && ((this.speedX < 0 && this.controls.left) || (this.speedX > 0 && this.controls.right))) {
            //             this.speedY /= 2;
            //             distanceRemaining /= 2;
            //         }
            //         speedX = 0;
            //         this.speedX = 0;
            //     }
            // }
            else {
                // if (liquid < 0.25 && this.speedY >= 0 && this.speedY <= this.gravity) {
                //     let stepLastY = this.y;
                //     this.y = Math.floor(lastY + this.height / 2 + this.stepHeight + 1) - this.height / 2;
                //     // if (this.isCollidingWithNewMap(lastX, stepLastY)) {
                //     if (this.isCollidingWithMap()) {
                //         speedY = 0;
                //         this.speedY = 0;
                //         for (let i = this.stepHeight; i >= 0; i--) {
                //             this.y = Math.floor(lastY + this.height / 2 + i) - this.height / 2;
                //             // if (!this.isCollidingWithNewMap(lastX, stepLastY)) {
                //             if (!this.isCollidingWithMap()) {
                //                 break;
                //             }
                //         }
                //     }
                //     else {
                //         this.y = stepLastY;
                //     }
                // }
                if (this.speedY >= 0 && this.speedY <= this.gravity) {
                    let stepLastY = this.y;
                    this.y += 1e-5;
                    if (!this.isCollidingWithMap(this.x, stepLastY)) {
                        this.y += this.stepHeight;
                        if (this.isCollidingWithMap(this.x, stepLastY)) {
                            this.collideWithMap(this.x, stepLastY);
                        }
                        else {
                            this.y = stepLastY;
                        }
                    }
                    else {
                        this.y = stepLastY;
                    }
                    // this.y = Math.floor(lastY + this.height / 2 + this.stepHeight + 1) - this.height / 2;
                    // // if (this.isCollidingWithNewMap(lastX, stepLastY)) {
                    // if (this.isCollidingWithMap()) {
                    //     speedY = 0;
                    //     this.speedY = 0;
                    //     for (let i = this.stepHeight; i >= 0; i--) {
                    //         this.y = Math.floor(lastY + this.height / 2 + i) - this.height / 2;
                    //         // if (!this.isCollidingWithNewMap(lastX, stepLastY)) {
                    //         if (!this.isCollidingWithMap()) {
                    //             break;
                    //         }
                    //     }
                    // }
                    // else {
                    //     this.y = stepLastY;
                    // }
                }
            }

            if (this.speedX == 0 && this.speedY == 0) {
                break;
            }
        }
    },
    // isCollidingWithMap: function() {
    //     if (this.x - this.width / 2 < 0 || this.x + this.width / 2 > SimulatedMap.list.get(this.map).width || this.y - this.height / 2 < 0 || this.y + this.height / 2 > SimulatedMap.list.get(this.map).height) {
    //         return true;
    //     }
    //     for (let y = Math.floor(this.y - this.height / 2); y < Math.ceil(this.y + this.height / 2); y++) {
    //         for (let x = Math.floor(this.x - this.width / 2); x < Math.ceil(this.x + this.width / 2); x++) {
    //             if (pixels[SimulatedMap.list.get(this.map).grid[(x + y * SimulatedMap.list.get(this.map).width) * SimulatedMap.list.get(this.map).stride + Pixel.Id]].state == State.Solid) {
    //                 return true;
    //             }
    //         }
    //     }
    //     return false;
    // },
    // isCollidingWithNewMap: function(lastX: number, lastY: number) {
    //     if (this.x - this.width / 2 < 0 || this.x + this.width / 2 > SimulatedMap.list.get(this.map).width || this.y - this.height / 2 < 0 || this.y + this.height / 2 > SimulatedMap.list.get(this.map).height) {
    //         return true;
    //     }
    //     for (let y = Math.floor(this.y - this.height / 2); y < Math.ceil(this.y + this.height / 2); y++) {
    //         for (let x = Math.floor(this.x - this.width / 2); x < Math.ceil(this.x + this.width / 2); x++) {
    //             if (x >= Math.floor(lastX - this.width / 2) && x < Math.ceil(lastX + this.width / 2) && y >= Math.floor(lastY - this.height / 2) && y < Math.ceil(lastY + this.height / 2)) {
    //                 continue;
    //             }
    //             if (pixels[SimulatedMap.list.get(this.map).grid[(x + y * SimulatedMap.list.get(this.map).width) * SimulatedMap.list.get(this.map).stride + Pixel.Id]].state == State.Solid) {
    //                 return true;
    //             }
    //             // if (this.speedY >= 0 && !this.controls.down && pixels[SimulatedMap.list.get(this.map).grid[y][x]].state == State.SolidPlatform && y >= Math.ceil(lastY + this.height / 2)) {
    //             //     return true;
    //             // }
    //             if (this.speedY >= 0 && !this.controls.down && pixels[SimulatedMap.list.get(this.map).grid[(x + y * SimulatedMap.list.get(this.map).width) * SimulatedMap.list.get(this.map).stride + Pixel.Id]].state == State.SolidPlatform && y >= Math.ceil(lastY + this.height / 2) - 1) {
    //                 return true;
    //             }
    //         }
    //     }
    //     return false;
    // },
    isCollidingWithMapLiquid: function() {
        // if (this.x - this.width / 2 < 0 || this.x + this.width / 2 > SimulatedMap.list.get(this.map).width || this.y - this.height / 2 < 0 || this.y + this.height / 2 > SimulatedMap.list.get(this.map).height) {
        //     return 0;
        // }
        let liquid = 0;
        // for (let y = Math.floor(this.y - this.height / 2); y < Math.ceil(this.y + this.height / 2); y++) {
        //     for (let x = Math.floor(this.x - this.width / 2); x < Math.ceil(this.x + this.width / 2); x++) {
        //         if (pixels[SimulatedMap.list.get(this.map).grid[(x + y * SimulatedMap.list.get(this.map).width) * SimulatedMap.list.get(this.map).stride + Pixel.Id]].state == State.Liquid) {
        //             let width = Math.min(Math.min(1, x - this.x + this.width / 2), this.x + this.width / 2 - x);
        //             let height = Math.min(Math.min(1, y - this.y + this.height / 2), this.y + this.height / 2 - y);
        //             liquid += width * height;
        //         }
        //     }
        // }
        return liquid;
    },
    
    isCollidingWithCollision: function(collision: Collision, lastX: number, lastY: number) {
        switch (collision.type) {
            case CollisionType.Rectangle:
                if (collision.platform && (this.controls.down || lastY + this.height / 2 > collision.y - collision.height / 2)) {
                    return false;
                }
                break;
            case CollisionType.TriangleBottomLeft:
            case CollisionType.StairBottomLeft:
                if (collision.platform && (this.controls.down || (lastY + this.height / 2 - collision.y > collision.height / collision.width * (lastX - this.width / 2 - collision.x) + 1e-10 && lastY + this.height / 2 > collision.y - collision.height / 2))) {
                    return false;
                }
                break;
            case CollisionType.TriangleBottomRight:
            case CollisionType.StairBottomRight:
                if (collision.platform && (this.controls.down || (lastY + this.height / 2 - collision.y > -collision.height / collision.width * (lastX + this.width / 2 - collision.x) + 1e-10 && lastY + this.height / 2 > collision.y - collision.height / 2))) {
                    return false;
                }
                break;
        }
        switch (collision.type) {
            case CollisionType.Rectangle:
                if (this.x - this.width / 2 < collision.x + collision.width / 2 && this.x + this.width / 2 > collision.x - collision.width / 2 && this.y - this.height / 2 < collision.y + collision.height / 2 && this.y + this.height / 2 > collision.y - collision.height / 2) {
                    return true;
                }
                break;
            case CollisionType.TriangleTopLeft:
            case CollisionType.StairTopLeft:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return false;
                }
                // if (this.x + this.width / 2 <= collision.x - collision.width / 2) {
                //     return false;
                // }
                // if (this.y + this.height / 2 <= collision.y - collision.height / 2) {
                //     return false;
                // }
                if (this.y - this.height / 2 - collision.y >= -collision.height / collision.width * (this.x - this.width / 2 - collision.x) - 1e-10) {
                    return false;
                }
                return true;
            case CollisionType.TriangleTopRight:
            case CollisionType.StairTopRight:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return false;
                }
                // if (this.x - this.width / 2 >= collision.x + collision.width / 2) {
                //     return false;
                // }
                // if (this.y + this.height / 2 <= collision.y - collision.height / 2) {
                //     return false;
                // }
                if (this.y - this.height / 2 - collision.y >= collision.height / collision.width * (this.x + this.width / 2 - collision.x) - 1e-10) {
                    return false;
                }
                return true;
            case CollisionType.TriangleBottomLeft:
            case CollisionType.StairBottomLeft:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return false;
                }
                // if (this.x + this.width / 2 <= collision.x - collision.width / 2) {
                //     return false;
                // }
                // if (this.y - this.height / 2 >= collision.y + collision.height / 2) {
                //     return false;
                // }
                if (this.y + this.height / 2 - collision.y <= collision.height / collision.width * (this.x - this.width / 2 - collision.x) + 1e-10) {
                    return false;
                }
                return true;
            case CollisionType.TriangleBottomRight:
            case CollisionType.StairBottomRight:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return false;
                }
                // if (this.x - this.width / 2 >= collision.x + collision.width / 2) {
                //     return false;
                // }
                // if (this.y - this.height / 2 >= collision.y + collision.height / 2) {
                //     return false;
                // }
                if (this.y + this.height / 2 - collision.y <= -collision.height / collision.width * (this.x + this.width / 2 - collision.x) + 1e-10) {
                    return false;
                }
                return true;
        }
        return false;
    },
    collideWithCollision: function(collision: Collision, lastX: number, lastY: number) {
        switch (collision.type) {
            case CollisionType.Rectangle:
                if (collision.platform && (this.controls.down || lastY + this.height / 2 > collision.y - collision.height / 2)) {
                    return;
                }
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return;
                }
                if (this.y - this.height / 2 < collision.y - collision.height / 2 && lastY + this.height / 2 <= collision.y - collision.height / 2) {
                    this.y = collision.y - collision.height / 2 - this.height / 2;
                    this.speedY = 0;
                    this.onGround = 3;
                }
                else if (this.y + this.height / 2 > collision.y + collision.height / 2 && lastY - this.height / 2 >= collision.y + collision.height / 2) {
                    this.y = collision.y + collision.height / 2 + this.height / 2;
                    this.speedY = 0;
                }
                else if (this.x - this.width / 2 < collision.x - collision.width / 2 && lastX + this.width / 2 <= collision.x - collision.width / 2) {
                    this.x = collision.x - collision.width / 2 - this.width / 2;
                    this.speedX = 0;
                }
                else if (this.x + this.width / 2 > collision.x + collision.width / 2 && lastX - this.width / 2 >= collision.x + collision.width / 2) {
                    this.x = collision.x + collision.width / 2 + this.width / 2;
                    this.speedX = 0;
                }
                break;
            case CollisionType.TriangleTopLeft:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return;
                }
                // if (this.x + this.width / 2 <= collision.x - collision.width / 2) {
                //     return;
                // }
                // if (this.y + this.height / 2 <= collision.y - collision.height / 2) {
                //     return;
                // }
                if (this.y - this.height / 2 - collision.y >= -collision.height / collision.width * (this.x - this.width / 2 - collision.x) - 1e-10) {
                    return;
                }
                if (this.y + this.height / 2 - collision.y > -collision.height / collision.width * (this.x + this.width / 2 - collision.x) && lastY - this.height / 2 - collision.y >= -collision.height / collision.width * (lastX - this.width / 2 - collision.x) - 1e-10) {
                    let cos = collision.width / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
                    let sin = collision.height / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
                    let distance = (this.y - this.height / 2 - collision.y + collision.height / collision.width * (this.x - this.width / 2 - collision.x)) * cos;
                    this.x -= distance * sin;
                    this.y -= distance * cos;
                    let perpendicular = -this.speedX * sin + -this.speedY * cos;
                    this.speedX += perpendicular * sin;
                    this.speedY += perpendicular * cos;
                }
                else if (this.y - this.height / 2 < collision.y - collision.height / 2 && lastY + this.height / 2 <= collision.y - collision.height / 2) {
                    this.y = collision.y - collision.height / 2 - this.height / 2;
                    this.speedY = 0;
                    this.onGround = 3;
                }
                else if (this.y + this.height / 2 > collision.y + collision.height / 2 && lastY - this.height / 2 >= collision.y + collision.height / 2) {
                    this.y = collision.y + collision.height / 2 + this.height / 2;
                    this.speedY = 0;
                }
                else if (this.x - this.width / 2 < collision.x - collision.width / 2 && lastX + this.width / 2 <= collision.x - collision.width / 2) {
                    this.x = collision.x - collision.width / 2 - this.width / 2;
                    this.speedX = 0;
                }
                else if (this.x + this.width / 2 > collision.x + collision.width / 2 && lastX - this.width / 2 >= collision.x + collision.width / 2) {
                    this.x = collision.x + collision.width / 2 + this.width / 2;
                    this.speedX = 0;
                }
                break;
            case CollisionType.StairTopLeft:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return;
                }
                // if (this.x + this.width / 2 <= collision.x - collision.width / 2) {
                //     return;
                // }
                // if (this.y + this.height / 2 <= collision.y - collision.height / 2) {
                //     return;
                // }
                if (this.y - this.height / 2 - collision.y >= -collision.height / collision.width * (this.x - this.width / 2 - collision.x) - 1e-10) {
                    return;
                }
                if (this.y + this.height / 2 - collision.y > -collision.height / collision.width * (this.x + this.width / 2 - collision.x) && lastY - this.height / 2 - collision.y >= -collision.height / collision.width * (lastX - this.width / 2 - collision.x) - 1e-10) {
                    let distance = this.y - this.height / 2 - collision.y + collision.height / collision.width * (this.x - this.width / 2 - collision.x);
                    this.y -= distance;
                    this.speedY = 0;
                }
                else if (this.y - this.height / 2 < collision.y - collision.height / 2 && lastY + this.height / 2 <= collision.y - collision.height / 2) {
                    this.y = collision.y - collision.height / 2 - this.height / 2;
                    this.speedY = 0;
                    this.onGround = 3;
                }
                else if (this.y + this.height / 2 > collision.y + collision.height / 2 && lastY - this.height / 2 >= collision.y + collision.height / 2) {
                    this.y = collision.y + collision.height / 2 + this.height / 2;
                    this.speedY = 0;
                }
                else if (this.x - this.width / 2 < collision.x - collision.width / 2 && lastX + this.width / 2 <= collision.x - collision.width / 2) {
                    this.x = collision.x - collision.width / 2 - this.width / 2;
                    this.speedX = 0;
                }
                else if (this.x + this.width / 2 > collision.x + collision.width / 2 && lastX - this.width / 2 >= collision.x + collision.width / 2) {
                    this.x = collision.x + collision.width / 2 + this.width / 2;
                    this.speedX = 0;
                }
                break;
            case CollisionType.TriangleTopRight:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return;
                }
                // if (this.x - this.width / 2 >= collision.x + collision.width / 2) {
                //     return;
                // }
                // if (this.y + this.height / 2 <= collision.y - collision.height / 2) {
                //     return;
                // }
                if (this.y - this.height / 2 - collision.y >= collision.height / collision.width * (this.x + this.width / 2 - collision.x) - 1e-10) {
                    return;
                }
                if (this.y + this.height / 2 - collision.y > collision.height / collision.width * (this.x - this.width / 2 - collision.x) && lastY - this.height / 2 - collision.y >= collision.height / collision.width * (lastX + this.width / 2 - collision.x) - 1e-10) {
                    let cos = collision.width / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
                    let sin = collision.height / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
                    let distance = (this.y - this.height / 2 - collision.y - collision.height / collision.width * (this.x + this.width / 2 - collision.x)) * cos;
                    this.x += distance * sin;
                    this.y -= distance * cos;
                    let perpendicular = this.speedX * sin + -this.speedY * cos;
                    this.speedX -= perpendicular * sin;
                    this.speedY += perpendicular * cos;
                }
                else if (this.y - this.height / 2 < collision.y - collision.height / 2 && lastY + this.height / 2 <= collision.y - collision.height / 2) {
                    this.y = collision.y - collision.height / 2 - this.height / 2;
                    this.speedY = 0;
                    this.onGround = 3;
                }
                else if (this.y + this.height / 2 > collision.y + collision.height / 2 && lastY - this.height / 2 >= collision.y + collision.height / 2) {
                    this.y = collision.y + collision.height / 2 + this.height / 2;
                    this.speedY = 0;
                }
                else if (this.x - this.width / 2 < collision.x - collision.width / 2 && lastX + this.width / 2 <= collision.x - collision.width / 2) {
                    this.x = collision.x - collision.width / 2 - this.width / 2;
                    this.speedX = 0;
                }
                else if (this.x + this.width / 2 > collision.x + collision.width / 2 && lastX - this.width / 2 >= collision.x + collision.width / 2) {
                    this.x = collision.x + collision.width / 2 + this.width / 2;
                    this.speedX = 0;
                }
                break;
            case CollisionType.StairTopRight:
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return;
                }
                // if (this.x - this.width / 2 >= collision.x + collision.width / 2) {
                //     return;
                // }
                // if (this.y + this.height / 2 <= collision.y - collision.height / 2) {
                //     return;
                // }
                if (this.y - this.height / 2 - collision.y >= collision.height / collision.width * (this.x + this.width / 2 - collision.x) - 1e-10) {
                    return;
                }
                if (this.y + this.height / 2 - collision.y > collision.height / collision.width * (this.x - this.width / 2 - collision.x) && lastY - this.height / 2 - collision.y >= collision.height / collision.width * (lastX + this.width / 2 - collision.x) - 1e-10) {
                    let distance = this.y - this.height / 2 - collision.y - collision.height / collision.width * (this.x + this.width / 2 - collision.x);
                    this.y -= distance;
                    this.speedY = 0;
                }
                else if (this.y - this.height / 2 < collision.y - collision.height / 2 && lastY + this.height / 2 <= collision.y - collision.height / 2) {
                    this.y = collision.y - collision.height / 2 - this.height / 2;
                    this.speedY = 0;
                    this.onGround = 3;
                }
                else if (this.y + this.height / 2 > collision.y + collision.height / 2 && lastY - this.height / 2 >= collision.y + collision.height / 2) {
                    this.y = collision.y + collision.height / 2 + this.height / 2;
                    this.speedY = 0;
                }
                else if (this.x - this.width / 2 < collision.x - collision.width / 2 && lastX + this.width / 2 <= collision.x - collision.width / 2) {
                    this.x = collision.x - collision.width / 2 - this.width / 2;
                    this.speedX = 0;
                }
                else if (this.x + this.width / 2 > collision.x + collision.width / 2 && lastX - this.width / 2 >= collision.x + collision.width / 2) {
                    this.x = collision.x + collision.width / 2 + this.width / 2;
                    this.speedX = 0;
                }
                break;
            case CollisionType.TriangleBottomLeft:
                if (collision.platform && (this.controls.down || (lastY + this.height / 2 - collision.y > collision.height / collision.width * (lastX - this.width / 2 - collision.x) + 1e-10 && lastY + this.height / 2 > collision.y - collision.height / 2))) {
                    return;
                }
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return;
                }
                // if (this.x + this.width / 2 <= collision.x - collision.width / 2) {
                //     return;
                // }
                // if (this.y - this.height / 2 >= collision.y + collision.height / 2) {
                //     return;
                // }
                if (this.y + this.height / 2 - collision.y <= collision.height / collision.width * (this.x - this.width / 2 - collision.x) + 1e-10) {
                    return;
                }
                if (this.y - this.height / 2 - collision.y < collision.height / collision.width * (this.x + this.width / 2 - collision.x) && lastY + this.height / 2 - collision.y <= collision.height / collision.width * (lastX - this.width / 2 - collision.x) + 1e-10) {
                    let cos = collision.width / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
                    let sin = collision.height / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
                    let distance = (this.y + this.height / 2 - collision.y - collision.height / collision.width * (this.x - this.width / 2 - collision.x)) * cos;
                    this.x += distance * sin;
                    this.y -= distance * cos;
                    let perpendicular = -this.speedX * sin + this.speedY * cos;
                    this.speedX += perpendicular * sin;
                    this.speedY -= perpendicular * cos;
                    this.onGround = 3;
                }
                else if (this.y - this.height / 2 < collision.y - collision.height / 2 && lastY + this.height / 2 <= collision.y - collision.height / 2) {
                    this.y = collision.y - collision.height / 2 - this.height / 2;
                    this.speedY = 0;
                    this.onGround = 3;
                }
                else if (this.y + this.height / 2 > collision.y + collision.height / 2 && lastY - this.height / 2 >= collision.y + collision.height / 2) {
                    this.y = collision.y + collision.height / 2 + this.height / 2;
                    this.speedY = 0;
                }
                else if (this.x - this.width / 2 < collision.x - collision.width / 2 && lastX + this.width / 2 <= collision.x - collision.width / 2) {
                    this.x = collision.x - collision.width / 2 - this.width / 2;
                    this.speedX = 0;
                }
                else if (this.x + this.width / 2 > collision.x + collision.width / 2 && lastX - this.width / 2 >= collision.x + collision.width / 2) {
                    this.x = collision.x + collision.width / 2 + this.width / 2;
                    this.speedX = 0;
                }
                break;
            case CollisionType.StairBottomLeft:
                if (collision.platform && (this.controls.down || (lastY + this.height / 2 - collision.y > collision.height / collision.width * (lastX - this.width / 2 - collision.x) + 1e-10 && lastY + this.height / 2 > collision.y - collision.height / 2))) {
                    return;
                }
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return;
                }
                // if (this.x + this.width / 2 <= collision.x - collision.width / 2) {
                //     return;
                // }
                // if (this.y - this.height / 2 >= collision.y + collision.height / 2) {
                //     return;
                // }
                if (this.y + this.height / 2 - collision.y <= collision.height / collision.width * (this.x - this.width / 2 - collision.x) + 1e-10) {
                    return;
                }
                if (this.y - this.height / 2 - collision.y < collision.height / collision.width * (this.x + this.width / 2 - collision.x) && lastY + this.height / 2 - collision.y <= collision.height / collision.width * (lastX - this.width / 2 - collision.x) + 1e-10) {
                    let distance = this.y + this.height / 2 - collision.y - collision.height / collision.width * (this.x - this.width / 2 - collision.x);
                    this.y -= distance;
                    this.speedY = 0;
                    this.onGround = 3;
                }
                else if (this.y - this.height / 2 < collision.y - collision.height / 2 && lastY + this.height / 2 <= collision.y - collision.height / 2) {
                    this.y = collision.y - collision.height / 2 - this.height / 2;
                    this.speedY = 0;
                    this.onGround = 3;
                }
                else if (this.y + this.height / 2 > collision.y + collision.height / 2 && lastY - this.height / 2 >= collision.y + collision.height / 2) {
                    this.y = collision.y + collision.height / 2 + this.height / 2;
                    this.speedY = 0;
                }
                else if (this.x - this.width / 2 < collision.x - collision.width / 2 && lastX + this.width / 2 <= collision.x - collision.width / 2) {
                    this.x = collision.x - collision.width / 2 - this.width / 2;
                    this.speedX = 0;
                }
                else if (this.x + this.width / 2 > collision.x + collision.width / 2 && lastX - this.width / 2 >= collision.x + collision.width / 2) {
                    this.x = collision.x + collision.width / 2 + this.width / 2;
                    this.speedX = 0;
                }
                break;
            case CollisionType.TriangleBottomRight:
                if (collision.platform && (this.controls.down || (lastY + this.height / 2 - collision.y > -collision.height / collision.width * (lastX + this.width / 2 - collision.x) + 1e-10 && lastY + this.height / 2 > collision.y - collision.height / 2))) {
                    return;
                }
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return;
                }
                // if (this.x - this.width / 2 >= collision.x + collision.width / 2) {
                //     return;
                // }
                // if (this.y - this.height / 2 >= collision.y + collision.height / 2) {
                //     return;
                // }
                if (this.y + this.height / 2 - collision.y <= -collision.height / collision.width * (this.x + this.width / 2 - collision.x) + 1e-10) {
                    return;
                }
                if (this.y - this.height / 2 - collision.y < -collision.height / collision.width * (this.x - this.width / 2 - collision.x) && lastY + this.height / 2 - collision.y <= -collision.height / collision.width * (lastX + this.width / 2 - collision.x) + 1e-10) {
                    let cos = collision.width / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
                    let sin = collision.height / Math.sqrt(Math.pow(collision.width, 2) + Math.pow(collision.height, 2));
                    let distance = (this.y + this.height / 2 - collision.y + collision.height / collision.width * (this.x + this.width / 2 - collision.x)) * cos;
                    this.x -= distance * sin;
                    this.y -= distance * cos;
                    let perpendicular = this.speedX * sin + this.speedY * cos;
                    this.speedX -= perpendicular * sin;
                    this.speedY -= perpendicular * cos;
                    this.onGround = 3;
                }
                else if (this.y - this.height / 2 < collision.y - collision.height / 2 && lastY + this.height / 2 <= collision.y - collision.height / 2) {
                    this.y = collision.y - collision.height / 2 - this.height / 2;
                    this.speedY = 0;
                    this.onGround = 3;
                }
                else if (this.y + this.height / 2 > collision.y + collision.height / 2 && lastY - this.height / 2 >= collision.y + collision.height / 2) {
                    this.y = collision.y + collision.height / 2 + this.height / 2;
                    this.speedY = 0;
                }
                else if (this.x - this.width / 2 < collision.x - collision.width / 2 && lastX + this.width / 2 <= collision.x - collision.width / 2) {
                    this.x = collision.x - collision.width / 2 - this.width / 2;
                    this.speedX = 0;
                }
                else if (this.x + this.width / 2 > collision.x + collision.width / 2 && lastX - this.width / 2 >= collision.x + collision.width / 2) {
                    this.x = collision.x + collision.width / 2 + this.width / 2;
                    this.speedX = 0;
                }
                break;
            case CollisionType.StairBottomRight:
                if (collision.platform && (this.controls.down || (lastY + this.height / 2 - collision.y > -collision.height / collision.width * (lastX + this.width / 2 - collision.x) + 1e-10 && lastY + this.height / 2 > collision.y - collision.height / 2))) {
                    return;
                }
                if (this.x - this.width / 2 >= collision.x + collision.width / 2 || this.x + this.width / 2 <= collision.x - collision.width / 2 || this.y - this.height / 2 >= collision.y + collision.height / 2 || this.y + this.height / 2 <= collision.y - collision.height / 2) {
                    return;
                }
                // if (this.x - this.width / 2 >= collision.x + collision.width / 2) {
                //     return;
                // }
                // if (this.y - this.height / 2 >= collision.y + collision.height / 2) {
                //     return;
                // }
                if (this.y + this.height / 2 - collision.y <= -collision.height / collision.width * (this.x + this.width / 2 - collision.x) + 1e-10) {
                    return;
                }
                if (this.y - this.height / 2 - collision.y < -collision.height / collision.width * (this.x - this.width / 2 - collision.x) && lastY + this.height / 2 - collision.y <= -collision.height / collision.width * (lastX + this.width / 2 - collision.x) + 1e-10) {
                    let distance = this.y + this.height / 2 - collision.y + collision.height / collision.width * (this.x + this.width / 2 - collision.x);
                    this.y -= distance;
                    this.speedY = 0;
                    this.onGround = 3;
                }
                else if (this.y - this.height / 2 < collision.y - collision.height / 2 && lastY + this.height / 2 <= collision.y - collision.height / 2) {
                    this.y = collision.y - collision.height / 2 - this.height / 2;
                    this.speedY = 0;
                    this.onGround = 3;
                }
                else if (this.y + this.height / 2 > collision.y + collision.height / 2 && lastY - this.height / 2 >= collision.y + collision.height / 2) {
                    this.y = collision.y + collision.height / 2 + this.height / 2;
                    this.speedY = 0;
                }
                else if (this.x - this.width / 2 < collision.x - collision.width / 2 && lastX + this.width / 2 <= collision.x - collision.width / 2) {
                    this.x = collision.x - collision.width / 2 - this.width / 2;
                    this.speedX = 0;
                }
                else if (this.x + this.width / 2 > collision.x + collision.width / 2 && lastX - this.width / 2 >= collision.x + collision.width / 2) {
                    this.x = collision.x + collision.width / 2 + this.width / 2;
                    this.speedX = 0;
                }
                break;
        }
        return false;
    },
    isCollidingWithMap: function(lastX: number, lastY: number) {
        if (this.collideWithEdge && (this.x - this.width / 2 < 0 || this.x + this.width / 2 > StaticMap.list.get(this.map).width * 8 || this.y - this.height / 2 < 0 || this.y + this.height / 2 > StaticMap.list.get(this.map).height * 8)) {
            return true;
        }
        for (let y = Math.min(Math.max(Math.floor((this.y - this.height / 2) / 8), 0), StaticMap.list.get(this.map).height - 1); y < Math.min(Math.max(Math.ceil((this.y + this.height / 2) / 8), 1), StaticMap.list.get(this.map).height); y++) {
            for (let x = Math.min(Math.max(Math.floor((this.x - this.width / 2) / 8), 0), StaticMap.list.get(this.map).width - 1); x < Math.min(Math.max(Math.ceil((this.x + this.width / 2) / 8), 1), StaticMap.list.get(this.map).width); x++) {
                let collisions = StaticMap.list.get(this.map).collisions[x + y * StaticMap.list.get(this.map).width];
                for (let i = 0; i < collisions.length; i++) {
                    if (this.isCollidingWithCollision(collisions[i], lastX, lastY)) {
                        return true;
                    }
                }
            }
        }
        for (let [_, rig] of Rig.list) {
            if (rig.id == this.id) {
                continue;
            }
            if (rig.collision != null) {
                if (this.isCollidingWithCollision(rig.collision, lastX, lastY)) {
                    return true;
                }
            }
        }
        return false;
    },
    collideWithMap: function(lastX: number, lastY: number) {
        let lastSpeedX = this.speedX;
        let lastSpeedY = this.speedY;
        if (this.collideWithEdge) {
            if (this.x - this.width / 2 < 0) {
                this.x = this.width / 2;
                this.speedX = 0;
            }
            if (this.x + this.width / 2 > StaticMap.list.get(this.map).width * 8) {
                this.x = StaticMap.list.get(this.map).width * 8 - this.width / 2;
                this.speedX = 0;
            }
            if (this.y - this.height / 2 < 0) {
                this.y = this.height / 2;
                this.speedY = 0;
            }
            if (this.y + this.height / 2 > StaticMap.list.get(this.map).height * 8) {
                this.y = StaticMap.list.get(this.map).height * 8 - this.height / 2;
                this.speedY = 0;
            }
        }
        let collisions = [];
        for (let y = Math.min(Math.max(Math.floor((this.y - this.height / 2) / 8), 0), StaticMap.list.get(this.map).height - 1); y < Math.min(Math.max(Math.ceil((this.y + this.height / 2) / 8), 1), StaticMap.list.get(this.map).height); y++) {
            for (let x = Math.min(Math.max(Math.floor((this.x - this.width / 2) / 8), 0), StaticMap.list.get(this.map).width - 1); x < Math.min(Math.max(Math.ceil((this.x + this.width / 2) / 8), 1), StaticMap.list.get(this.map).width); x++) {
                collisions.push(...StaticMap.list.get(this.map).collisions[x + y * StaticMap.list.get(this.map).width]);
            }
        }
        for (let [_, rig] of Rig.list) {
            if (rig.id == this.id) {
                continue;
            }
            if (rig.collision != null) {
                collisions.push(rig.collision);
            }
        }
        // for (let y = Math.max(Math.floor((this.y - this.height / 2) / 8) - 1, 0); y < Math.min(Math.ceil((this.y + this.height / 2) / 8) + 1, StaticMap.list.get(this.map).height - 1); y++) {
        //     for (let x = Math.max(Math.floor((this.x - this.width / 2) / 8) - 1, 0); x < Math.min(Math.ceil((this.x + this.width / 2) / 8) + 1, StaticMap.list.get(this.map).width - 1); x++) {
        //         collisions.push(...StaticMap.list.get(this.map).collisions[x + y * StaticMap.list.get(this.map).width]);
        //     }
        // }
        collisions.sort((a: Collision, b: Collision) => {
            if (a.x == b.x) {
                return lastSpeedY * (a.y - b.y);
            }
            return lastSpeedX * (a.x - b.x);
        });
        for (let i = 0; i < collisions.length; i++) {
            this.collideWithCollision(collisions[i], lastX, lastY);
        }
        // return false;
    },
    getMapFriction: function(lastX: number, lastY: number) {
        if (this.collideWithEdge && (this.x - this.width / 2 < 0 || this.x + this.width / 2 > StaticMap.list.get(this.map).width * 8 || this.y - this.height / 2 < 0 || this.y + this.height / 2 > StaticMap.list.get(this.map).height * 8)) {
            return 1;
        }
        let friction = 0;
        for (let y = Math.min(Math.max(Math.floor((this.y - this.height / 2) / 8), 0), StaticMap.list.get(this.map).height - 1); y < Math.min(Math.max(Math.ceil((this.y + this.height / 2) / 8), 1), StaticMap.list.get(this.map).height); y++) {
            for (let x = Math.min(Math.max(Math.floor((this.x - this.width / 2) / 8), 0), StaticMap.list.get(this.map).width - 1); x < Math.min(Math.max(Math.ceil((this.x + this.width / 2) / 8), 1), StaticMap.list.get(this.map).width); x++) {
                let collisions = StaticMap.list.get(this.map).collisions[x + y * StaticMap.list.get(this.map).width];
                for (let i = 0; i < collisions.length; i++) {
                    if (this.isCollidingWithCollision(collisions[i], lastX, lastY)) {
                        friction = Math.max(collisions[i].friction, friction);
                    }
                }
            }
        }
        for (let [_, rig] of Rig.list) {
            if (rig.id == this.id) {
                continue;
            }
            if (rig.collision != null) {
                if (this.isCollidingWithCollision(rig.collision, lastX, lastY)) {
                    friction = Math.max(rig.collision.friction, friction);
                }
            }
        }
        return friction;
    },
    isCollidingWithTeleporter: function(teleporter: Teleporter) {
        if (this.x - this.width / 2 >= teleporter.x + teleporter.width / 2 || this.x + this.width / 2 <= teleporter.x - teleporter.width / 2 || this.y - this.height / 2 >= teleporter.y + teleporter.height / 2 || this.y + this.height / 2 <= teleporter.y - teleporter.height / 2) {
            return false;
        }
        if (this.speedX < 0 && teleporter.moveDirection == "left") {
            return true;
        }
        if (this.speedX > 0 && teleporter.moveDirection == "right") {
            return true;
        }
        if (this.speedY < 0 && teleporter.moveDirection == "up") {
            return true;
        }
        if (this.speedY > 0 && teleporter.moveDirection == "down") {
            return true;
        }
        return false;
    },
    collideWithTeleporter: function() {
        let teleporters = StaticMap.list.get(this.map).teleporters;
        for (let i = 0; i < teleporters.length; i++) {
            if (this.isCollidingWithTeleporter(teleporters[i])) {
                // this.teleport(teleporters[i].teleportX + (teleporters[i].teleportRelativeX ? this.x : 0), teleporters[i].teleportY + (teleporters[i].teleportRelativeY ? this.y + this.height / 2 : 0), teleporters[i].teleportMap, this.mapInstance, teleporters[i].direction);
                this.teleporting = true;
                this.teleportSent = false;
                this.teleportDirection = teleporters[i].direction;
                return;
            }
        }
    },
    isCollidingWithCollectiblePerk: function(collectiblePerk: CollectiblePerk) {
        if (this.x - this.width / 2 >= collectiblePerk.x + 4 || this.x + this.width / 2 <= collectiblePerk.x - 4 || this.y - this.height / 2 >= collectiblePerk.y + 4 || this.y + this.height / 2 <= collectiblePerk.y - 4) {
            return false;
        }
        return true;
    },
    collideWithCollectiblePerk: function() {
        let collectiblePerks = StaticMap.list.get(this.map).collectiblePerks;
        for (let i = 0; i < collectiblePerks.length; i++) {
            if (unlockedPerks.has(collectiblePerks[i].perkId)) {
                continue;
            }
            if (this.isCollidingWithCollectiblePerk(collectiblePerks[i])) {
                this.collectingPerk = collectiblePerks[i];
                // this.unlockedPerks.add(collectiblePerks[i].perkId);
                // this.socket.emit("unlockPerk", collectiblePerks[i].perkId);
                return;
            }
        }
    },
};

export { clientPlayer };