import { Controls, AnimationType, Weapon, Customizations } from "./rig.js";
import { SimulatedMap } from "../map/map.js";
import { Pixel, pixels, State } from "../map/pixels.js";
import { weaponData } from "../game/loader.js";

enum MoveType {
    Controls,
}

let clientPlayer: {
    id: number,
    random: Function,
    tick: number,
    x: number,
    y: number,
    speedX: number,
    speedY: number,
    width: number,
    height: number,
    map: number,
    moveSpeed: number,
    jumpHeight: number,
    stepHeight: number,
    gravity: number,
    moveType: MoveType,
    controls: Controls,
    controlsHistory: Map<number, Controls>,
    customizations: Customizations,
    animation: AnimationType,
    animationFrame: number,
    animationSpeed: number,
    weapons: Weapon[],
    attackCooldown: number,
    reloadCooldown: number,
    name: string,
    hp: number,
    hpMax: number,
    respawning: boolean,
    update: Function,
    updateMovement: Function,
    updateAnimation: Function,
    updateAttack: Function,
    updateWeapon: Function,
    move: Function,
    isCollidingWithMap: Function,
    isCollidingWithNewMap: Function,
    isCollidingWithMapLiquid: Function,
} = {
    id: null,
    random: null,
    tick: 0,
    x: 0,
    y: 0,
    speedX: 0,
    speedY: 0,
    width: 0,
    height: 0,
    map: 0,
    moveSpeed: 0,
    jumpHeight: 0,
    stepHeight: 0,
    gravity: 0,
    moveType: MoveType.Controls,
    controls: {
        left: false,
        right: false,
        up: false,
        down: false,
        attack: false,
        reload: false,
        angle: 0,
        weapon: 0,
        lastWeapon: 0,
    },
    controlsHistory: new Map(),
    customizations: null,
    animation: AnimationType.Idle,
    animationFrame: 0,
    animationSpeed: 0,
    weapons: [],
    attackCooldown: 0,
    reloadCooldown: 0,
    name: null,
    hp: 0,
    hpMax: 0,
    respawning: false,
    update: function() {
        if (this.respawning) {
            this.respawnTime = Math.max(this.respawnTime - 1, 0);
            return;
        }
        if (this.controls.weapon != this.controls.lastWeapon) {
            this.updateWeapon();
            this.controls.lastWeapon = this.controls.weapon;
        }
        this.updateMovement();
        this.updateAnimation();
        this.updateAttack();
    },
    updateMovement: function() {
        let liquid = this.isCollidingWithMapLiquid() / this.width / this.height;
        this.speedX *= 0.9;
        this.speedY += this.gravity;
        this.speedY -= this.gravity * liquid * 2;
        this.speedY *= 1 - liquid * 0.05;
        let grounded = false;
        let wallJumpDirection = 0;
        let lastY = this.y;
        this.y += 1;
        if (this.isCollidingWithNewMap(this.x, lastY)) {
            grounded = true;
        }
        this.y = lastY;
        if (!grounded && this.speedY > 0) {
            if (this.controls.left) {
                let lastX = this.x;
                this.x -= 1;
                if (this.isCollidingWithNewMap(lastX, this.y)) {
                    grounded = true;
                    wallJumpDirection -= 1;
                }
                this.x = lastX;
            }
            if (this.controls.right) {
                let lastX = this.x;
                this.x += 1;
                if (this.isCollidingWithNewMap(lastX, this.y)) {
                    grounded = true;
                    wallJumpDirection += 1;
                }
                this.x = lastX;
            }
        }
        if (this.moveType == MoveType.Controls) {
            // this.speedX = 0;
            if (this.controls.left) {
                this.speedX -= this.moveSpeed;
            }
            if (this.controls.right) {
                this.speedX += this.moveSpeed;
            }
            if (this.controls.up && grounded) {
                this.speedX -= wallJumpDirection * Math.sqrt(2 * this.jumpHeight * this.gravity);
                this.speedY = -Math.sqrt(2 * this.jumpHeight * this.gravity);
                this.animationFrame = 0;
                grounded = false;
            }
            // if (this.controls.down) {
            //     this.speedY += this.moveSpeed;
            // }
        }
        if (!this.controls.left && !this.controls.right) {
            this.speedX *= 0.8;
        }
        this.move();
    },
    updateAnimation: function() {
        let grounded = false;
        let wallJumpDirection = 0;
        let lastY = this.y;
        this.y += 1;
        if (this.isCollidingWithNewMap(this.x, lastY)) {
            grounded = true;
        }
        this.y = lastY;
        if (!grounded && this.speedY > 0) {
            if (this.controls.left) {
                let lastX = this.x;
                this.x -= 1;
                if (this.isCollidingWithNewMap(lastX, this.y)) {
                    grounded = true;
                    wallJumpDirection -= 1;
                }
                this.x = lastX;
            }
            if (this.controls.right) {
                let lastX = this.x;
                this.x += 1;
                if (this.isCollidingWithNewMap(lastX, this.y)) {
                    grounded = true;
                    wallJumpDirection += 1;
                }
                this.x = lastX;
            }
        }
        if (!grounded) {
            this.animation = AnimationType.Jump;
        }
        else if (wallJumpDirection != 0) {
            this.animation = AnimationType.Climb;
        }
        else if (Math.abs(this.speedX) >= 1 / 4) {
            this.animation = AnimationType.Run;
        }
        else {
            this.animation = AnimationType.Idle;
            this.animationFrame = 0;
            // this.animation = AnimationType.AimMiddle;
        }
        switch (this.animation) {
            case AnimationType.Idle:
                // this.animationFrame += this.animationSpeed / 10;
                break;
            case AnimationType.Run:
                if ((Math.abs(this.controls.angle) > Math.PI / 2) == (this.speedX < 0)) {
                    if (this.animationFrame < 0) {
                        this.animationFrame = this.animationFrame % 6 + 6;
                    }
                    this.animationFrame += this.animationSpeed * Math.abs(this.speedX) * 2 / 3;
                }
                else {
                    if (this.animationFrame > 0) {
                        this.animationFrame = this.animationFrame % 6 - 6;
                    }
                    this.animationFrame -= this.animationSpeed * Math.abs(this.speedX) * 2 / 3;
                }
                break;
            case AnimationType.Jump:
                if (this.animationFrame < 0) {
                    this.animationFrame *= -1;
                }
                this.animationFrame += this.animationSpeed;
                break;
        }
    },
    updateAttack: function() {
        let weapon = this.weapons[this.controls.weapon];
        weapon.animationFrame -= 1;
        if (this.controls.reload && this.reloadCooldown <= 0) {
            weapon.ammo = 0;
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
        if (this.controls.attack && this.attackCooldown <= 0) {
            for (let i = 0; i < weapon.projectileCount; i++) {
                if (weaponData[weapon.id].projectile != null) {
                    let angle = this.controls.angle + (this.random() * 2 - 1) * weapon.projectileSpread;
                    // new Projectile(weaponData[weapon.id].projectile, this.x + weapon.offsetX, this.y + weapon.offsetY, this.speedX + weapon.projectileSpeed * Math.cos(angle), this.speedY + weapon.projectileSpeed * Math.sin(angle), this.map, angle, 60 * 60, weapon.damage, weapon.critDamage, weapon.knockback, weapon.piercing, this);
                    this.speedX += -weapon.projectileSpeed * weapon.recoil * Math.cos(angle);
                    this.speedY += -weapon.projectileSpeed * weapon.recoil * Math.sin(angle);
                }
                else if (weaponData[weapon.id].projectiles != null) {
                    let totalWeight = 0;
                    for (let j in weaponData[weapon.id].projectiles) {
                        totalWeight += weaponData[weapon.id].projectiles[j].weight;
                    }
                    let random = this.random() * totalWeight;
                    for (let j in weaponData[weapon.id].projectiles) {
                        let projectileData = weaponData[weapon.id].projectiles[j];
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
        if (weapon.ammo == 0) {
            this.attackCooldown = 0;
            this.reloadCooldown = weapon.reloadSpeed;
        }
        else {
            this.attackCooldown = weapon.attackSpeed;
            this.reloadCooldown = 0;
        }
    },
    move: function() {
        let distanceRemaining = Math.sqrt(Math.pow(this.speedX, 2) + Math.pow(this.speedY, 2));
        let speedX = this.speedX / distanceRemaining;
        let speedY = this.speedY / distanceRemaining;
        let times = 0;
        let liquid = this.isCollidingWithMapLiquid() / this.width / this.height;
        while (distanceRemaining > 0) {
            let planeX = Math.max(Math.sign(speedX), -1e-10);
            let planeY = Math.max(Math.sign(speedY), -1e-10);
            let inverseSpeedX = 1 / speedX;
            let inverseSpeedY = 1 / speedY;
            let frontX = this.x + this.width / 2 * Math.sign(speedX);
            let frontY = this.y + this.height / 2 * Math.sign(speedY);
            let xDistance = (planeX - (frontX - Math.floor(frontX))) * inverseSpeedX;
            let yDistance = (planeY - (frontY - Math.floor(frontY))) * inverseSpeedY;

            // let xAligned = Math.abs(this.x + this.width / 2 - Math.floor(this.x + this.width / 2)) < 1e-5;
            // let yAligned = Math.abs(this.y + this.width / 2 - Math.floor(this.y + this.width / 2)) < 1e-5;

            if (!isFinite(xDistance)) {
                xDistance = Infinity;
            }
            if (!isFinite(yDistance)) {
                yDistance = Infinity;
            }
            
            let lastX = this.x;
            let lastY = this.y;
            
            let distance = Math.min(Math.min(xDistance, yDistance), distanceRemaining);

            this.x += speedX * distance;
            this.y += speedY * distance;
            distanceRemaining -= distance;
            times += 1;
            if (times > 100) {
                console.warn("moved >100 times!")
                break;
            }

            // if (this.x - this.width / 2 <= 0) {
            //     this.x = this.width / 2;
            //     speedX = 0;
            //     this.speedX = 0;
            // }
            // if (this.x + this.width / 2 >= SimulatedMap.list.get(this.map).width) {
            //     this.x = SimulatedMap.list.get(this.map).width - this.width / 2;
            //     speedX = 0;
            //     this.speedX = 0;
            // }
            // if (this.y - this.height / 2 <= 0) {
            //     this.y = this.height / 2;
            //     speedY = 0;
            //     this.speedY = 0;
            // }
            // if (this.y + this.height / 2 >= SimulatedMap.list.get(this.map).height) {
            //     this.y = SimulatedMap.list.get(this.map).height - this.height / 2;
            //     speedY = 0;
            //     this.speedY = 0;
            // }

            // console.log(this.x, this.y, distance)
            collide: if (this.isCollidingWithNewMap(lastX, lastY)) {
                // if (this instanceof Rig) {
                // if (this.speedY >= 0) {
                    let stepLastY = this.y;
                    for (let i = 0; i <= this.stepHeight; i++) {
                        this.y = Math.ceil(lastY + this.height / 2 - i) - this.height / 2;
                        // this.y = lastY - i;
                        // if (this.y - this.height / 2 <= 0) {
                        //     this.y = this.height / 2;
                        // }
                        if (!this.isCollidingWithNewMap(lastX, lastY)) {
                            // this.y = Math.ceil(this.y + this.height / 2) - this.height / 2;
                            speedY = 0;
                            this.speedY = 0;
                            break collide;
                        }
                    }
                    this.y = stepLastY;
                // }
            // if (this.isCollidingWithMap()) {
                // if (Math.abs(planeX - (this.x - Math.floor(this.x))) < 1e-5) {
                // if (distance == xDistance) {
                let nextX = this.x;
                this.x = lastX;
                if (this.isCollidingWithNewMap(lastX, lastY)) {
                    this.x = nextX;
                    this.y = lastY;
                    speedY = 0;
                    this.speedY = 0;
                    if (this.isCollidingWithNewMap(lastX, lastY)) {
                        this.x = lastX;
                        speedX = 0;
                        this.speedX = 0;
                    }
                }
                else {
                    if (this.speedY > 0 && ((this.speedX < 0 && this.controls.left) || (this.speedX > 0 && this.controls.right))) {
                        this.speedY /= 2;
                        distanceRemaining /= 2;
                    }
                    speedX = 0;
                    this.speedX = 0;
                }
                // if (xAligned) {
                //     speedX = 0;
                //     this.speedX = 0;
                //     this.x = lastX;
                // }
                // // if (Math.abs(planeY - (this.y - Math.floor(this.y))) < 1e-5) {
                // // if (distance == yDistance) {
                // if (yAligned) {
                //     speedY = 0;
                //     this.speedY = 0;
                //     this.y = lastY;
                // }
            }
            else {
                if (liquid < 0.25 && this.speedY >= 0 && this.speedY <= this.gravity) {
                    let stepLastY = this.y;
                    this.y = Math.floor(lastY + this.height / 2 + this.stepHeight + 1) - this.height / 2;
                    if (this.isCollidingWithNewMap(lastX, stepLastY)) {
                        speedY = 0;
                        this.speedY = 0;
                        for (let i = this.stepHeight; i >= 0; i--) {
                            this.y = Math.floor(lastY + this.height / 2 + i) - this.height / 2;
                            if (!this.isCollidingWithNewMap(lastX, stepLastY)) {
                                break;
                            }
                        }
                    }
                    else {
                        this.y = stepLastY;
                    }
                }
            }

            if (this.speedX == 0 && this.speedY == 0) {
                break;
            }
        }
        // let distanceRemaining = Math.sqrt(Math.pow(this.speedX, 2) + Math.pow(this.speedY, 2));
        // let speedX = this.speedX / distanceRemaining;
        // let speedY = this.speedY / distanceRemaining;
        // let times = 0;
        // while (distanceRemaining > 0) {
        //     let planeX = Math.max(Math.sign(speedX), -1e-10);
        //     let planeY = Math.max(Math.sign(speedY), -1e-10);
        //     let inverseSpeedX = 1 / speedX;
        //     let inverseSpeedY = 1 / speedY;
        //     let xDistance = (planeX - (this.x + this.width / 2 - Math.floor(this.x + this.width / 2 * Math.sign(speedX)))) * inverseSpeedX;
        //     let yDistance = (planeY - (this.y + this.width / 2 - Math.floor(this.y + this.height / 2 * Math.sign(speedY)))) * inverseSpeedY;

        //     if (!isFinite(xDistance)) {
        //         xDistance = Infinity;
        //     }
        //     if (!isFinite(yDistance)) {
        //         yDistance = Infinity;
        //     }
            
        //     let lastX = this.x;
        //     let lastY = this.y;
            
        //     let distance = Math.min(Math.min(xDistance, yDistance), distanceRemaining);

        //     this.x += speedX * distance;
        //     this.y += speedY * distance;
        //     distanceRemaining -= distance;
        //     times += 1;
        //     if (times > 100) {
        //         console.warn("moved >100 times!")
        //         break;
        //     }
        //     collide: if (this.isCollidingWithNewMap(lastX, lastY)) {
        //         let stepLastY = this.y;
        //         for (let i = 0; i <= this.stepHeight; i++) {
        //             this.y = Math.ceil(lastY + this.height / 2 - i) - this.height / 2;
        //             if (!this.isCollidingWithNewMap(lastX, lastY)) {
        //                 speedY = 0;
        //                 this.speedY = 0;
        //                 break collide;
        //             }
        //         }
        //         this.y = stepLastY;
        //         let nextX = this.x;
        //         this.x = lastX;
        //         if (this.isCollidingWithNewMap(lastX, lastY)) {
        //             this.x = nextX;
        //             this.y = lastY;
        //             speedY = 0;
        //             this.speedY = 0;
        //             if (this.isCollidingWithNewMap(lastX, lastY)) {
        //                 this.x = lastX;
        //                 speedX = 0;
        //                 this.speedX = 0;
        //             }
        //         }
        //         else {
        //             if (this.speedY > 0 && ((this.speedX < 0 && this.controls.left) || (this.speedX > 0 && this.controls.right))) {
        //                 this.speedY /= 2;
        //                 distanceRemaining /= 2;
        //             }
        //             speedX = 0;
        //             this.speedX = 0;
        //         }
        //     }
        //     else {
        //         if (this.speedY >= 0 && this.speedY <= this.gravity) {
        //             let stepLastY = this.y;
        //             this.y = Math.floor(stepLastY + this.stepHeight + 1);
        //             if (this.isCollidingWithNewMap(lastX, stepLastY)) {
        //                 speedY = 0;
        //                 this.speedY = 0;
        //                 for (let i = this.stepHeight; i >= 0; i--) {
        //                     this.y = Math.floor(stepLastY + i);
        //                     if (!this.isCollidingWithNewMap(lastX, stepLastY)) {
        //                         break;
        //                     }
        //                 }
        //             }
        //             else {
        //                 this.y = stepLastY;
        //             }
        //         }
        //     }

        //     if (this.speedX == 0 && this.speedY == 0) {
        //         break;
        //     }
        // }
    },
    isCollidingWithMap: function() {
        if (this.x - this.width / 2 < 0 || this.x + this.width / 2 > SimulatedMap.list.get(this.map).width || this.y - this.height / 2 < 0 || this.y + this.height / 2 > SimulatedMap.list.get(this.map).height) {
            return true;
        }
        for (let y = Math.floor(this.y - this.height / 2); y < Math.ceil(this.y + this.height / 2); y++) {
            for (let x = Math.floor(this.x - this.width / 2); x < Math.ceil(this.x + this.width / 2); x++) {
                if (pixels[SimulatedMap.list.get(this.map).grid[(x + y * SimulatedMap.list.get(this.map).width) * SimulatedMap.list.get(this.map).stride + Pixel.Id]].state == State.Solid) {
                    return true;
                }
            }
        }
        return false;
    },
    isCollidingWithNewMap: function(lastX: number, lastY: number) {
        if (this.x - this.width / 2 < 0 || this.x + this.width / 2 > SimulatedMap.list.get(this.map).width || this.y - this.height / 2 < 0 || this.y + this.height / 2 > SimulatedMap.list.get(this.map).height) {
            return true;
        }
        for (let y = Math.floor(this.y - this.height / 2); y < Math.ceil(this.y + this.height / 2); y++) {
            for (let x = Math.floor(this.x - this.width / 2); x < Math.ceil(this.x + this.width / 2); x++) {
                if (x >= Math.floor(lastX - this.width / 2) && x < Math.ceil(lastX + this.width / 2) && y >= Math.floor(lastY - this.height / 2) && y < Math.ceil(lastY + this.height / 2)) {
                    continue;
                }
                if (pixels[SimulatedMap.list.get(this.map).grid[(x + y * SimulatedMap.list.get(this.map).width) * SimulatedMap.list.get(this.map).stride + Pixel.Id]].state == State.Solid) {
                    return true;
                }
                // if (this.speedY >= 0 && !this.controls.down && pixels[SimulatedMap.list.get(this.map).grid[y][x]].state == State.SolidPlatform && y >= Math.ceil(lastY + this.height / 2)) {
                //     return true;
                // }
                if (this.speedY >= 0 && !this.controls.down && pixels[SimulatedMap.list.get(this.map).grid[(x + y * SimulatedMap.list.get(this.map).width) * SimulatedMap.list.get(this.map).stride + Pixel.Id]].state == State.SolidPlatform && y >= Math.ceil(lastY + this.height / 2) - 1) {
                    return true;
                }
            }
        }
        return false;
    },
    isCollidingWithMapLiquid: function() {
        if (this.x - this.width / 2 < 0 || this.x + this.width / 2 > SimulatedMap.list.get(this.map).width || this.y - this.height / 2 < 0 || this.y + this.height / 2 > SimulatedMap.list.get(this.map).height) {
            return 0;
        }
        let liquid = 0;
        for (let y = Math.floor(this.y - this.height / 2); y < Math.ceil(this.y + this.height / 2); y++) {
            for (let x = Math.floor(this.x - this.width / 2); x < Math.ceil(this.x + this.width / 2); x++) {
                if (pixels[SimulatedMap.list.get(this.map).grid[(x + y * SimulatedMap.list.get(this.map).width) * SimulatedMap.list.get(this.map).stride + Pixel.Id]].state == State.Liquid) {
                    let width = Math.min(Math.min(1, x - this.x + this.width / 2), this.x + this.width / 2 - x);
                    let height = Math.min(Math.min(1, y - this.y + this.height / 2), this.y + this.height / 2 - y);
                    liquid += width * height;
                }
            }
        }
        return liquid;
    },
};

export { clientPlayer };