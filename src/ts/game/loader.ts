import { serverIp } from "../../index.js";

let images = new Map<string, HTMLImageElement>();

let playerImage = new Image();
playerImage.src = "/src/img/player.png";
images.set("player", playerImage);

interface ProjectileData {
    image: string,
    imageX?: number,
    imageY?: number,
    imageWidth?: number,
    imageHeight?: number,
    imageOffsetX?: number,
    imageOffsetY?: number,
    width: number,
    height: number,
    phantomFrames: number,
    despawnTime: number,
    gravity: number,
    changeRotation: boolean,
    collisionEvents: CollisionEvent[],
}

interface CollisionEvent {
    type: string,
    data: any,
}

interface WeaponCustomization {
    [key: string]: {
        images?: {
            conditions?: {
                [key: string]: string,
            },
            x: number,
            y: number,
            width: number,
            height: number,
            offsetX: number,
            offsetY: number,
        }[],
        imageX?: number,
        imageY?: number,
        imageWidth?: number,
        imageHeight?: number,
        imageOffsetX?: number,
        imageOffsetY?: number,
        damage?: number,
        critDamage?: number,
        knockback?: number,
        piercing?: number,
        attackSpeed?: number,
        projectileSpeed?: number,
        projectileCount?: number,
        projectileSpread?: number,
        recoil?: number,
        knockbackResistance?: number,
        ammoMax?: number,
        reloadSpeed?: number,
    },
}
interface WeaponProjectile {
    weight: number,
    damage?: number,
    critDamage?: number,
    knockback?: number,
    piercing?: number,
    attackSpeed?: number,
    projectileSpeed?: number,
    projectileCount?: number,
    projectileSpread?: number,
    recoil?: number,
    knockbackResistance?: number,
    ammoMax?: number,
    reloadSpeed?: number,
}
interface WeaponData {
    image: string,
    imageOffsetX: number,
    imageOffsetY: number,
    type: string,
    offsetX: number,
    offsetY: number,
    damage: number,
    critDamage: number,
    knockback: number,
    piercing: number,
    attackSpeed: number,
    projectile?: string,
    projectiles?: {
        [key: string]: WeaponProjectile
    },
    projectileSpeed: number,
    projectileCount: number,
    projectileSpread: number,
    recoil: number,
    knockbackResistance: number,
    ammoMax: number,
    reloadSpeed: number,
    customizations: {
        [key: string]: WeaponCustomization,
    },
}

let projectileData: {[key: string]: ProjectileData} = await (await fetch(serverIp + "assets/projectiles.json")).json();
for (let i in projectileData) {
    let image = new Image();
    image.src = "/src/img/" + projectileData[i].image;
    images.set(projectileData[i].image, image);
}


let weaponData: {[key: string]: WeaponData} = await (await fetch(serverIp + "assets/weapons.json")).json();
for (let i in weaponData) {
    let image = new Image();
    image.src = "/src/img/" + weaponData[i].image;
    images.set(weaponData[i].image, image);
}

export { images, WeaponCustomization, projectileData, weaponData };