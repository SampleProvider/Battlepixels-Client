import { serverIp, socket } from "../../index.js";
import { Player, Weapon } from "../entity/player.js";
import { images } from "../game/loader.js";
import { inventory } from "./inventory.js";

interface WeaponCustomization {
    inputX: number,
    inputY: number,
    options: {
        [key: string]: {
            name: string,
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
            ammoMax?: number,
            reloadSpeed?: number,
        },
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
    ammoMax?: number,
    reloadSpeed?: number,
}
interface WeaponData {
    name: string,
    type: string,
    description: string,
    image: string,
    imageOffsetX: number,
    imageOffsetY: number,
    holdAnimation: string,
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
    ammoMax: number,
    reloadSpeed: number,
    customizations: {
        [key: string]: WeaponCustomization,
    },
}

let hoveringIndex = -1;

// class Item {
//     type = ItemType.Item;

//     id: string;
//     amount: number;

//     static data: { [key: string]: ItemData };
    
//     constructor(id: string, amount: number) {
//         this.id = id;
//         this.amount = amount;
//     }
    
//     static createDiv(item: Item) {
//         if (item.type == ItemType.Weapon) {
//             return WeaponItem.createDiv(item);
//         }
//         let div = document.createElement("div");
//         div.classList.add("weapon");

//         let image = document.createElement("img");
//         image.classList.add("itemImage");
//         div.appendChild(image);

//         let typeOutline = document.createElement("div");
//         typeOutline.classList.add("weaponTypeOutline");
//         div.appendChild(typeOutline);

//         let type = document.createElement("div");
//         type.classList.add("weaponType");
//         div.appendChild(type);

//         div.onmouseover = (e) => {
//             document.getElementById("tooltip").style.display = "revert-layer";
//             let rect = div.getBoundingClientRect();
//             document.getElementById("tooltip").style.left = rect.left + rect.width / 2 + 25 + 8 + "px";
//             document.getElementById("tooltip").style.top = rect.top + rect.height / 2 - 25 + "px";
//             document.getElementById("tooltip").style.left = rect.left + rect.width / 2 + 32 + 8 + "px";
//             document.getElementById("tooltip").style.top = rect.top + rect.height / 2 - 32 + "px";
//             document.getElementById("tooltip").style.left = e.clientX + "px";
//             document.getElementById("tooltip").style.top = e.clientY + "px";
//             document.getElementById("tooltipTitle").innerText = Item.data[item.id].name;
//             document.getElementById("tooltipContent").innerText = Item.data[item.id].description;
//             for (let i = 0; i < inventory.items.length; i++) {
//                 if (inventory.items[i] == item) {
//                     hoveringIndex = i;
//                     break;
//                 }
//             }
//         };
//         div.onmousemove = (e) => {
//             document.getElementById("tooltip").style.display = "revert-layer";
//             let rect = div.getBoundingClientRect();
//             document.getElementById("tooltip").style.left = rect.left + rect.width / 2 + 25 + 8 + "px";
//             document.getElementById("tooltip").style.top = rect.top + rect.height / 2 - 25 + "px";
//             document.getElementById("tooltip").style.left = rect.left + rect.width / 2 + 32 + 8 + "px";
//             document.getElementById("tooltip").style.top = rect.top + rect.height / 2 - 32 + "px";
//             document.getElementById("tooltip").style.left = e.clientX + "px";
//             document.getElementById("tooltip").style.top = e.clientY + "px";
//         };
//         div.onmouseout = () => {
//             document.getElementById("tooltip").style.display = "none";
//             hoveringIndex = -1;
//         };

//         // weaponDivs.set(i, {
//         //     weapon: weaponDiv,
//         //     background: weaponBackground,
//         //     image: weaponImage,
//         //     indexOutline: weaponIndexOutline,
//         //     index: weaponIndex,
//         //     typeOutline: weaponTypeOutline,
//         //     type: weaponType,
//         // });

//         let canvas = document.createElement("canvas");
//         let ctx = canvas.getContext("2d");
//         canvas.width = 16;
//         canvas.height = 16;
//         ctx.imageSmoothingEnabled = false;
//         ctx.drawImage(images.get(Item.data[item.id].image), 0, 0);
//         image.src = canvas.toDataURL("image/png");
//         // indexOutline.innerText = (weapon + 1).toString();
//         // index.innerText = (weapon + 1).toString();
//         typeOutline.innerText = item.amount.toString();
//         type.innerText = item.amount.toString();

//         return div;
//     }
//     static updateDiv(item: Item, div: HTMLDivElement) {
//     }

//     static from(item: Item) {
//         if (item.type == ItemType.Weapon) {
//             return new WeaponItem(item.id, item.amount);
//         }
//         return new Item(item.id, item.amount);
//     }
//     static fromArray(items: Item[]) {
//         let newItems = [];
//         for (let i in items) {
//             newItems.push(Item.from(items[i]));
//         }
//         return newItems;
//     }

//     static async load() {
//         Item.data = await (await fetch(serverIp + "assets/items.json")).json();
//         for (let i in Item.data) {
//             let image = new Image();
//             image.src = "/src/img/" + Item.data[i].image;
//             images.set(Item.data[i].image, image);
//         }
//     }
// }

class WeaponItem {
    id: string;
    
    static data: { [key: string]: WeaponData };
    
    static getEquipSlot(type: string) {
        switch (type) {
            case "AR":
            case "MG":
                return 0;
            case "SG":
                return 1;
            case "SR":
                return 2;
            case "RL":
                return 3;
            case "RG":
                return 4;
            case "CV":
                return 5;
        }
        return -1;
    };
    
    static createDiv(weapon: WeaponItem) {
        let div = document.createElement("div");
        div.classList.add("weapon");

        let weaponBackground = document.createElement("div");
        weaponBackground.classList.add("weaponBackground");
        div.appendChild(weaponBackground);

        let weaponImage = document.createElement("img");
        weaponImage.classList.add("weaponImage");
        div.appendChild(weaponImage);

        let svgNS = "http://www.w3.org/2000/svg";

        let weaponIndexSvg = document.createElementNS(svgNS, "svg");
        weaponIndexSvg.classList.add("weaponIndexSvg");
        div.appendChild(weaponIndexSvg);

        let weaponIndex = document.createElementNS(svgNS, "text");
        weaponIndex.classList.add("weaponIndex");
        weaponIndex.setAttribute("x", "0%");
        weaponIndex.setAttribute("y", "0%");
        weaponIndex.setAttribute("text-anchor", "start");
        weaponIndex.setAttribute("dominant-baseline", "hanging");
        weaponIndex.setAttribute("stroke", "black");
        weaponIndex.setAttribute("stroke-width", "5");
        weaponIndex.setAttribute("stroke-linejoin", "round");
        weaponIndex.setAttribute("fill", "white");
        weaponIndexSvg.appendChild(weaponIndex);

        let weaponTypeSvg = document.createElementNS(svgNS, "svg");
        weaponTypeSvg.classList.add("weaponTypeSvg");
        div.appendChild(weaponTypeSvg);

        let weaponType = document.createElementNS(svgNS, "text");
        weaponType.classList.add("weaponType");
        weaponType.setAttribute("x", "100%");
        weaponType.setAttribute("y", "100%");
        weaponType.setAttribute("text-anchor", "end");
        weaponType.setAttribute("dominant-baseline", "auto");
        weaponType.setAttribute("stroke", "black");
        weaponType.setAttribute("stroke-width", "5");
        weaponType.setAttribute("stroke-linejoin", "round");
        weaponType.setAttribute("fill", "white");
        weaponTypeSvg.appendChild(weaponType);

        // div.onkeydown = (e) => {
        //     // weaponDivs.get(clientPlayer.builds[build][weapon].id).weapon.classList.remove("selected");
        //     // clientPlayer.builds[build][weapon].id = i;
        //     // weaponDivs.get(clientPlayer.builds[build][weapon].id).weapon.classList.add("selected");
        //     // updateBuildWeapon(build, weapon);
        //     // selectWeapon(build, weapon);
        //     // socket.emit("buildCustomizations", {
        //     //     type: "weapon",
        //     //     build: build,
        //     //     weapon: weapon,
        //     //     id: i,
        //     // });
        //     for (let i = 0; i < inventory.items.length; i++) {
        //         if (inventory.items[i] == this) {
        //             socket.emit("equipItem", {
        //                 index: i,
        //                 equipIndex: Number(e.key),
        //             });
        //             break;
        //         }
        //     }
        // };

        div.onmouseover = (e) => {
            // document.getElementById("tooltip").style.display = "revert-layer";
            // let rect = div.getBoundingClientRect();
            // document.getElementById("tooltip").style.left = rect.left + rect.width / 2 + 25 + 8 + "px";
            // document.getElementById("tooltip").style.top = rect.top + rect.height / 2 - 25 + "px";
            // document.getElementById("tooltip").style.left = rect.left + rect.width / 2 + 32 + 8 + "px";
            // document.getElementById("tooltip").style.top = rect.top + rect.height / 2 - 32 + "px";
            // document.getElementById("tooltip").style.left = e.clientX + "px";
            // document.getElementById("tooltip").style.top = e.clientY + "px";
            // document.getElementById("tooltipTitle").innerText = WeaponItem.data[weapon.id].name;
            // document.getElementById("tooltipContent").innerText = WeaponItem.data[weapon.id].description;
            // for (let i = 0; i < inventory.weapons.length; i++) {
            //     if (inventory.weapons[i] == weapon) {
            //         hoveringIndex = i;
            //         break;
            //     }
            // }
        };
        div.onmousemove = (e) => {
            // document.getElementById("tooltip").style.display = "revert-layer";
            // let rect = div.getBoundingClientRect();
            // document.getElementById("tooltip").style.left = rect.left + rect.width / 2 + 25 + 8 + "px";
            // document.getElementById("tooltip").style.top = rect.top + rect.height / 2 - 25 + "px";
            // document.getElementById("tooltip").style.left = rect.left + rect.width / 2 + 32 + 8 + "px";
            // document.getElementById("tooltip").style.top = rect.top + rect.height / 2 - 32 + "px";
            // document.getElementById("tooltip").style.left = e.clientX + "px";
            // document.getElementById("tooltip").style.top = e.clientY + "px";
        };
        div.onmouseout = () => {
            // document.getElementById("tooltip").style.display = "none";
            // hoveringIndex = -1;
        };

        // weaponDivs.set(i, {
        //     weapon: weaponDiv,
        //     background: weaponBackground,
        //     image: weaponImage,
        //     indexOutline: weaponIndexOutline,
        //     index: weaponIndex,
        //     typeOutline: weaponTypeOutline,
        //     type: weaponType,
        // });

        return div;
    }
    static updateDiv(weapon: WeaponItem, div: HTMLDivElement) {
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        let renderingWeapon = {
            id: weapon.id,
        } as Weapon;
        Player.prerenderWeapon(renderingWeapon);
        canvas.width = renderingWeapon.prerenderCanvas.width;
        canvas.height = renderingWeapon.prerenderCanvas.height;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(renderingWeapon.prerenderCanvas, 0, 0);
        (div.querySelector(".weaponImage") as HTMLImageElement).src = canvas.toDataURL("image/png");
        div.querySelector(".weaponIndex").textContent = (WeaponItem.getEquipSlot(WeaponItem.data[weapon.id].type) + 1).toString();
        div.querySelector(".weaponType").textContent = WeaponItem.data[weapon.id].type;
    }

    static setInfo(weapon: WeaponItem, compareWeapon: WeaponItem, div: HTMLDivElement, infoDiv: HTMLDivElement) {
        let data = WeaponItem.data[weapon.id];
        (infoDiv.querySelector(".weaponImage") as HTMLImageElement).src = (div.querySelector(".weaponImage") as HTMLImageElement).src;
        infoDiv.querySelector(".weaponIndex").textContent = (WeaponItem.getEquipSlot(data.type) + 1).toString();
        infoDiv.querySelector(".weaponType").textContent = data.type;
        (infoDiv.querySelector(".weaponName") as HTMLDivElement).innerText = data.name;
        let description = "";
        let stats: {
            [key: string]: {
                name: string,
                unit?: string,
                color: string,
            },
        } = {
            damage: {
                name: "Damage",
                color: "red",
            },
            critDamage: {
                name: "Crit Damage",
                color: "red",
            },
            knockback: {
                name: "Knockback",
                unit: " pixel(s)/tick",
                color: "red",
            },
            piercing: {
                name: "Piercing",
                unit: " target(s)",
                color: "red",
            },
            attackSpeed: {
                name: "Attack Interval",
                unit: " tick(s)",
                color: "red",
            },
            projectileSpeed: {
                name: "Projectile Speed",
                unit: " pixel(s)/tick",
                color: "red",
            },
            projectileCount: {
                name: "Projectile Count",
                color: "red",
            },
            projectileSpread: {
                name: "Projectile Spread",
                unit: " degree(s)",
                color: "red",
            },
            recoil: {
                name: "Recoil",
                unit: " pixel(s)/tick",
                color: "red",
            },
            ammoMax: {
                name: "Max Ammo",
                color: "red",
            },
            reloadSpeed: {
                name: "Reload Time",
                unit: " tick(s)",
                color: "red",
            },
        };
        for (let i in stats) {
            let value = data[i as keyof WeaponData] as number;
            value = Math.round(value * 100) / 100;
            description += stats[i].name + ": <span style=\"color: " + stats[i].color + ";\">" + value.toString() + "</span>";
            if (stats[i].unit != null) {
                description += stats[i].unit.replaceAll("(s)", value == 1 ? "" : "s");
            }
            description += "<br>";
        }
        infoDiv.querySelector(".weaponDescription").innerHTML = description;
    }

    static async load() {
        WeaponItem.data = await (await fetch(serverIp + "assets/weapons.json")).json();
        for (let i in WeaponItem.data) {
            let image = new Image();
            image.src = "/src/img/" + WeaponItem.data[i].image;
            images.set(WeaponItem.data[i].image, image);
        }
    }
}

// document.addEventListener("keydown", (e) => {
//     if (hoveringIndex != -1) {
//         if (inventory.items[hoveringIndex].type != ItemType.Weapon) {
//             return;
//         }
//         // for (let i = 0; i < inventory.equippedItems.length; i++) {
//         //     if (inventory.equippedItems[i] == inventory.items[hoveringIndex]) {
//         //         return;
//         //     }
//         // }
//         socket.emit("equipItem", {
//             index: hoveringIndex,
//             // equipIndex: Number(e.key) - 1,
//         });
//         e.preventDefault();
//     }
// });

export { WeaponItem };