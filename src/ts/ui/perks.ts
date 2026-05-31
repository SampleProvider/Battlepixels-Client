import { serverIp, socket } from "../../index.js";

interface PerkData {
    name: string,
    description: string,
    cost: number,
    priority: number,
    x: number,
    y: number,
    parent: string,
}

// let perkData: { [key: string]: Perk } = null;
// let sortedPerks: string[] = [];
// let sortedPerkIndex: Map<string, number> = new Map();

// let perkDivs: { [key: string]: HTMLDivElement } = {};
// let selectedPerkDescription: HTMLDivElement = null;

let perks = new Set<string>();
let perkPoints = 0;

let unlockedPerks = new Set<string>();

let perkCanvas = document.getElementById("perkCanvas") as HTMLCanvasElement;
let perkCtx = perkCanvas.getContext("2d");
let rect = perkCanvas.getBoundingClientRect();
perkCanvas.width = rect.width;
perkCanvas.height = rect.height;
perkCanvas.width = 1038;
perkCanvas.height = 758;

let perkCameraX = 0;
let perkCameraY = 0;

class Perk {
    id: string;

    static data: { [key: string]: PerkData };

    static list = new Map<string, Perk>();

    constructor(id: string) {
        this.id = id;
        
        Perk.list.set(this.id, this);
    }
    draw(ctx: CanvasRenderingContext2D) {
        let x = Perk.data[this.id].x;
        let y = Perk.data[this.id].y;

        let scale = 1;
        let rotation = performance.now() / 1000;

        let size = (scale + 4) * 2;
        let gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(1, "#ffffff00");
        ctx.fillStyle = gradient;
        ctx.fillRect(x - size, y - size, size * 2, size * 2);

        ctx.fillStyle = "#000000";
        ctx.strokeStyle = "#ffffff";
        // for (let i in particles) {
        //     ctx.save();
        //     ctx.translate(x + Math.cos(particles[i].rotation) * particles[i].magnitude * scale, y + Math.sin(particles[i].rotation) * particles[i].magnitude * scale);
        //     ctx.rotate(rotation + particles[i].rotation);
        //     let size = particles[i].size * scale;
        //     ctx.lineWidth = 1;
        //     ctx.strokeRect(-size / 2, -size / 2, size, size);
        //     ctx.fillRect(-size / 2, -size / 2, size, size);
        //     ctx.restore();
        // }
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            let angle = rotation + Math.PI / 4 * i;
            let magnitude = Math.sin(performance.now() / 1000 + Math.PI * i) * Math.min(scale, 2) + 4;
            magnitude *= scale;
            if (i == 0) {
                ctx.moveTo(x + Math.cos(angle) * magnitude, y + Math.sin(angle) * magnitude);
            }
            else {
                ctx.lineTo(x + Math.cos(angle) * magnitude, y + Math.sin(angle) * magnitude);
            }
        }
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
    }
}

function drawPerks() {
    // perkCtx.resetTransform();
    // perkCtx.save();
    // perkCtx.translate(perkCameraX + perkCanvas.width / 2, perkCameraY + perkCanvas.height / 2);
    // for (let [_, perk] of Perk.list) {
    //     perk.draw(perkCtx);
    // }
    // perkCtx.restore();
};

async function loadPerks() {
    Perk.data = await (await fetch(serverIp + "assets/perks.json")).json();

    for (let i in Perk.data) {
        new Perk(i);
    }

    // for (let i in perkData) {
    //     sortedPerks.push(i);
    // }
    // sortedPerks.sort((a: string, b: string) => {
    //     return perkData[a].cost - perkData[b].cost;
    // });

    // for (let i = 0; i < sortedPerks.length; i++) {
    //     sortedPerkIndex.set(sortedPerks[i], i);
    //     let data = perkData[sortedPerks[i]];

    //     let perk = document.createElement("div");
    //     perk.classList.add("perk");
    //     document.getElementById("unequippedPerks").appendChild(perk);

    //     perk.style.backgroundColor = "hsla(" + (60 - Math.atan(data.cost) / Math.PI * 2 * 60) + ", 100%, 50%, 0.3)";
        
    //     let title = document.createElement("div");
    //     title.classList.add("perkTitle");
    //     perk.appendChild(title);

    //     title.innerText = data.name;
        
    //     let cost = document.createElement("div");
    //     cost.classList.add("perkCost");
    //     title.appendChild(cost);

    //     if (data.cost >= 0) {
    //         cost.innerText = "+" + data.cost;
    //     }
    //     else {
    //         cost.innerText = data.cost.toString();
    //     }
        
    //     let description = document.createElement("div");
    //     description.classList.add("perkDescription");
    //     description.classList.add("hidden");
    //     perk.appendChild(description);

    //     description.innerText = data.description;

    //     let equipButton = document.createElement("button");
    //     equipButton.classList.add("perkEquipButton");
    //     equipButton.classList.add("button");
    //     description.appendChild(equipButton);

    //     equipButton.innerText = "Equip";

    //     title.onclick = () => {
    //         if (description.classList.contains("hidden")) {
    //             if (description != selectedPerkDescription && selectedPerkDescription != null) {
    //                 selectedPerkDescription.classList.add("hidden");
    //             }
    //             description.classList.toggle("hidden");
    //             selectedPerkDescription = description;
    //         }
    //         else {
    //             description.classList.toggle("hidden");
    //         }
    //     };
    //     title.ondblclick = () => {
    //         if (perks.has(sortedPerks[i])) {
    //             if (perkPoints - perkData[sortedPerks[i]].cost < 0) {
    //                 return;
    //             }
    //             unequipPerk(sortedPerks[i], true);
    //             return;
    //         }
    //         if (perkPoints + perkData[sortedPerks[i]].cost < 0) {
    //             return;
    //         }
    //         equipPerk(sortedPerks[i], true);
    //     };

    //     equipButton.onclick = () => {
    //         if (perks.has(sortedPerks[i])) {
    //             if (perkPoints - perkData[sortedPerks[i]].cost < 0) {
    //                 return;
    //             }
    //             unequipPerk(sortedPerks[i], true);
    //             return;
    //         }
    //         if (perkPoints + perkData[sortedPerks[i]].cost < 0) {
    //             return;
    //         }
    //         equipPerk(sortedPerks[i], true);
    //     };

    //     perkDivs[sortedPerks[i]] = perk;
    // }
};

function setPerks(newPerks: Set<string>) {
    // for (let perk of perks) {
    //     unequipPerk(perk);
    // }
    // for (let perk of newPerks) {
    //     equipPerk(perk);
    // }
    perks = newPerks;
};
function setPerkPoints(newPerkPoints: number) {
    perkPoints = newPerkPoints;
    document.getElementById("perkPoints").innerText = "Perk Points: " + perkPoints;
};
// function setUnlockedPerks(newPerks: Set<string>) {
//     unlockedPerks = newPerks;
// };

// function equipPerk(perk: string, emit: boolean = false) {
//     if (emit) {
//         socket.emit("equipPerk", perk);
//     }
//     // if (selectedPerkDescription != null) {
//     //     selectedPerkDescription.classList.add("hidden");
//     // }
//     // for (let i = 0; i < perks.length; i++) {
//     //     if (perks[i] == perk) {
//     //         return;
//     //     }
//     //     if (sortedPerkIndex.get(perks[i]) > sortedPerkIndex.get(perk)) {
//     //         document.getElementById("unequippedPerks").removeChild(perkDivs[perk]);
//     //         document.getElementById("equippedPerks").insertBefore(perkDivs[perk], perkDivs[perks[i]]);
//     //         (perkDivs[perk].querySelector(".perkEquipButton") as HTMLDivElement).innerText = "Unequip";
//     //         perks.splice(i, 0, perk);
//     //         perkPoints += perkData[perk].cost;
//     //         document.getElementById("perkPoints").innerText = "Perk Points: " + perkPoints;
//     //         return;
//     //     }
//     // }
//     // document.getElementById("unequippedPerks").removeChild(perkDivs[perk]);
//     // document.getElementById("equippedPerks").appendChild(perkDivs[perk]);
//     // (perkDivs[perk].querySelector(".perkEquipButton") as HTMLDivElement).innerText = "Unequip";
//     // perks.push(perk);
//     // perkPoints += perkData[perk].cost;
//     // document.getElementById("perkPoints").innerText = "Perk Points: " + perkPoints;
// };
// function unequipPerk(perk: string, emit: boolean = false) {
//     if (emit) {
//         socket.emit("unequipPerk", perk);
//     }
//     // if (selectedPerkDescription != null) {
//     //     selectedPerkDescription.classList.add("hidden");
//     // }
//     // for (let i = 0; i < perks.length; i++) {
//     //     if (perks[i] == perk) {
//     //         document.getElementById("equippedPerks").removeChild(perkDivs[perk]);
//     //         for (let j = i + 1; j < perks.length; j++) {
//     //             if (sortedPerkIndex.get(perks[j]) > sortedPerkIndex.get(perks[i]) + j - i) {
//     //                 document.getElementById("unequippedPerks").insertBefore(perkDivs[perk], perkDivs[sortedPerks[sortedPerkIndex.get(perks[j - 1]) + 1]]);
//     //                 perks.splice(i, 1);
//     //                 perkPoints -= perkData[perk].cost;
//     //                 document.getElementById("perkPoints").innerText = "Perk Points: " + perkPoints;
//     //                 return;
//     //             }
//     //         }
//     //         if (sortedPerkIndex.get(perks[perks.length - 1]) == sortedPerks.length - 1) {
//     //             document.getElementById("unequippedPerks").appendChild(perkDivs[perk]);
//     //         }
//     //         else {
//     //             document.getElementById("unequippedPerks").insertBefore(perkDivs[perk], perkDivs[sortedPerks[sortedPerkIndex.get(perks[perks.length - 1]) + 1]]);
//     //         }
//     //         (perkDivs[perk].querySelector(".perkEquipButton") as HTMLDivElement).innerText = "Equip";
//     //         perks.splice(i, 1);
//     //         perkPoints -= perkData[perk].cost;
//     //         document.getElementById("perkPoints").innerText = "Perk Points: " + perkPoints;
//     //         return;
//     //     }
//     // }
// };

// socket.on("collectPerk", (data) => {
//     unlockedPerks.add(data);
// });

// export { perks, perkPoints, unlockedPerks, loadPerks, setPerks, setPerkPoints };
export { perks, perkPoints, unlockedPerks, Perk, loadPerks, setPerks, setPerkPoints, drawPerks };