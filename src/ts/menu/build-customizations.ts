import { socket } from "../../index.js";
import { clientPlayer } from "../entity/client-player.js";
import { Player, WeaponData, Weapon } from "../entity/player.js";
import { mouseX, mouseY } from "../game/controls.js";

const weaponCanvas: HTMLCanvasElement = document.getElementById("weaponCanvas") as HTMLCanvasElement;
const weaponCtx = weaponCanvas.getContext("2d") as CanvasRenderingContext2D;

function onResize() {
    let rect = weaponCanvas.getBoundingClientRect();
    weaponCanvas.width = rect.width * devicePixelRatio;
    weaponCanvas.height = rect.height * devicePixelRatio;
    weaponCtx.imageSmoothingEnabled = false;
};
window.addEventListener("resize", () => {
    onResize();
});
onResize();

let buildDivs: {
    build: HTMLDivElement,
    weapons: {
        weapon: HTMLDivElement,
        background: HTMLDivElement,
        image: HTMLImageElement,
        indexBorder: HTMLDivElement,
        index: HTMLDivElement,
        typeBorder: HTMLDivElement,
        type: HTMLDivElement,
    }[],
}[] = [];
let weaponDivs: Map<string, {
    weapon: HTMLDivElement,
    background: HTMLDivElement,
    image: HTMLImageElement,
    indexBorder: HTMLDivElement,
    index: HTMLDivElement,
    typeBorder: HTMLDivElement,
    type: HTMLDivElement,
}> = new Map();

let previewWeaponDivs: {
    weapon: HTMLDivElement,
    background: HTMLDivElement,
    image: HTMLImageElement,
    indexBorder: HTMLDivElement,
    index: HTMLDivElement,
    typeBorder: HTMLDivElement,
    type: HTMLDivElement,
}[] = [];

let selectedBuild: number = null;
let selectedWeapon: number = null;

function initAllBuildWeapons() {
    for (let i = 0; i < clientPlayer.builds.length; i++) {
        let build = document.createElement("div");
        build.classList.add("build");
        document.getElementById("buildsListContent").appendChild(build);

        if (i == clientPlayer.currentBuild) {
            build.classList.add("selected");
        }

        buildDivs[i] = {
            build: build,
            weapons: [],
        };

        for (let j = 0; j < clientPlayer.builds[i].length; j++) {
            let weaponDiv = document.createElement("div");
            weaponDiv.classList.add("weapon");
            build.appendChild(weaponDiv);

            let weaponBackground = document.createElement("div");
            weaponBackground.classList.add("weaponBackground");
            weaponDiv.appendChild(weaponBackground);

            let weaponImage = document.createElement("img");
            weaponImage.classList.add("weaponImage");
            weaponDiv.appendChild(weaponImage);

            let weaponIndexBorder = document.createElement("div");
            weaponIndexBorder.classList.add("weaponIndexBorder");
            weaponDiv.appendChild(weaponIndexBorder);

            let weaponIndex = document.createElement("div");
            weaponIndex.classList.add("weaponIndex");
            weaponDiv.appendChild(weaponIndex);

            let weaponTypeBorder = document.createElement("div");
            weaponTypeBorder.classList.add("weaponTypeBorder");
            weaponDiv.appendChild(weaponTypeBorder);

            let weaponType = document.createElement("div");
            weaponType.classList.add("weaponType");
            weaponDiv.appendChild(weaponType);

            weaponDiv.onclick = () => {
                selectWeapon(i, j);
            };

            buildDivs[i].weapons[j] = {
                weapon: weaponDiv,
                background: weaponBackground,
                image: weaponImage,
                indexBorder: weaponIndexBorder,
                index: weaponIndex,
                typeBorder: weaponTypeBorder,
                type: weaponType,
            };
            
            updateBuildWeapon(i, j);
        }
    }
    initAllPreviewWeapons();
    updateStats();
};
function updateBuildWeapon(build: number, weapon: number) {
    Player.prerenderWeapon(clientPlayer.builds[build][weapon] as Weapon);
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");
    let image = (clientPlayer.builds[build][weapon] as Weapon).prerenderCanvas;
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.imageSmoothingEnabled = false;
    // ctx.translate(canvas.width / 2, canvas.height / 2);
    // ctx.rotate(-Math.PI / 4);
    // ctx.drawImage(image, -image.width * 2, -image.height * 2, image.width * 4, image.height * 4);
    ctx.drawImage(image, 0, 0);
    buildDivs[build].weapons[weapon].image.src = canvas.toDataURL("image/png");
    buildDivs[build].weapons[weapon].indexBorder.innerText = (weapon + 1).toString();
    buildDivs[build].weapons[weapon].index.innerText = (weapon + 1).toString();
    buildDivs[build].weapons[weapon].typeBorder.innerText = Player.weaponData[clientPlayer.builds[build][weapon].id].type;
    buildDivs[build].weapons[weapon].type.innerText = Player.weaponData[clientPlayer.builds[build][weapon].id].type;
};
function initAllPreviewWeapons() {
    for (let i = 0; i < clientPlayer.builds[clientPlayer.currentBuild].length; i++) {
        let weaponDiv = document.createElement("div");
        weaponDiv.classList.add("weapon");
        document.getElementById("buildPreview").appendChild(weaponDiv);

        let weaponBackground = document.createElement("div");
        weaponBackground.classList.add("weaponBackground");
        weaponDiv.appendChild(weaponBackground);

        let weaponImage = document.createElement("img");
        weaponImage.classList.add("weaponImage");
        weaponDiv.appendChild(weaponImage);

        let weaponIndexBorder = document.createElement("div");
        weaponIndexBorder.classList.add("weaponIndexBorder");
        weaponDiv.appendChild(weaponIndexBorder);

        let weaponIndex = document.createElement("div");
        weaponIndex.classList.add("weaponIndex");
        weaponDiv.appendChild(weaponIndex);

        let weaponTypeBorder = document.createElement("div");
        weaponTypeBorder.classList.add("weaponTypeBorder");
        weaponDiv.appendChild(weaponTypeBorder);

        let weaponType = document.createElement("div");
        weaponType.classList.add("weaponType");
        weaponDiv.appendChild(weaponType);

        previewWeaponDivs[i] = {
            weapon: weaponDiv,
            background: weaponBackground,
            image: weaponImage,
            indexBorder: weaponIndexBorder,
            index: weaponIndex,
            typeBorder: weaponTypeBorder,
            type: weaponType,
        };

        updatePreviewWeapon(i);
    }
};
function updatePreviewWeapon(weapon: number) {
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");
    let image = (clientPlayer.builds[clientPlayer.currentBuild][weapon] as Weapon).prerenderCanvas;
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.imageSmoothingEnabled = false;
    // canvas.width = 64;
    // canvas.height = 64;
    // ctx.translate(canvas.width / 2, canvas.height / 2);
    // ctx.rotate(-Math.PI / 4);
    // ctx.scale(64 / 50, 64 / 50);
    // let image = (clientPlayer.builds[clientPlayer.currentBuild][weapon] as Weapon).prerenderCanvas;
    // ctx.drawImage(image, -image.width * 2, -image.height * 2, image.width * 4, image.height * 4);
    ctx.drawImage(image, 0, 0);
    previewWeaponDivs[weapon].image.src = canvas.toDataURL("image/png");
    previewWeaponDivs[weapon].indexBorder.innerText = (weapon + 1).toString();
    previewWeaponDivs[weapon].index.innerText = (weapon + 1).toString();
    previewWeaponDivs[weapon].typeBorder.innerText = Player.weaponData[clientPlayer.builds[clientPlayer.currentBuild][weapon].id].type;
    previewWeaponDivs[weapon].type.innerText = Player.weaponData[clientPlayer.builds[clientPlayer.currentBuild][weapon].id].type;
};

function selectWeapon(build: number, weapon: number) {
    if (selectedWeapon != null) {
        buildDivs[selectedBuild].weapons[selectedWeapon].weapon.classList.remove("selected")
    }
    buildDivs[build].weapons[weapon].weapon.classList.add("selected");

    if (selectedWeapon != weapon) {
        function getSlot(type: string) {
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
            }
            return -1;
        };

        document.getElementById("weaponsListContent").innerHTML = "";
        weaponDivs.clear();
        for (let i in Player.weaponData) {
            if (getSlot(Player.weaponData[i].type) != weapon) {
                continue;
            }
            let weaponDiv = document.createElement("div");
            weaponDiv.classList.add("weapon");
            document.getElementById("weaponsListContent").appendChild(weaponDiv);

            if (i == clientPlayer.builds[build][weapon].id) {
                weaponDiv.classList.add("selected");
            }

            let weaponBackground = document.createElement("div");
            weaponBackground.classList.add("weaponBackground");
            weaponDiv.appendChild(weaponBackground);

            let weaponImage = document.createElement("img");
            weaponImage.classList.add("weaponImage");
            weaponDiv.appendChild(weaponImage);

            let weaponIndexBorder = document.createElement("div");
            weaponIndexBorder.classList.add("weaponIndexBorder");
            weaponDiv.appendChild(weaponIndexBorder);

            let weaponIndex = document.createElement("div");
            weaponIndex.classList.add("weaponIndex");
            weaponDiv.appendChild(weaponIndex);

            let weaponTypeBorder = document.createElement("div");
            weaponTypeBorder.classList.add("weaponTypeBorder");
            weaponDiv.appendChild(weaponTypeBorder);

            let weaponType = document.createElement("div");
            weaponType.classList.add("weaponType");
            weaponDiv.appendChild(weaponType);

            weaponDiv.onclick = () => {
                weaponDivs.get(clientPlayer.builds[build][weapon].id).weapon.classList.remove("selected");
                clientPlayer.builds[build][weapon].id = i;
                weaponDivs.get(clientPlayer.builds[build][weapon].id).weapon.classList.add("selected");
                updateBuildWeapon(build, weapon);
                selectWeapon(build, weapon);
                socket.emit("buildCustomizations", {
                    type: "weapon",
                    build: build,
                    weapon: weapon,
                    id: i,
                });
            };

            weaponDiv.onmouseover = () => {
                // document.getElementById("tooltip").style.display = "revert-layer";
                let rect = weaponDiv.getBoundingClientRect();
                document.getElementById("tooltip").style.left = rect.left + rect.width / 2 + 25 + 8 + "px";
                document.getElementById("tooltip").style.top = rect.top + rect.height / 2 - 25 + "px";
                document.getElementById("tooltipTitle").innerText = Player.weaponData[i].name;
                document.getElementById("tooltipContent").innerText = "buh";
            };
            weaponDiv.onmouseout = () => {
                document.getElementById("tooltip").style.display = "none";
            };

            weaponDivs.set(i, {
                weapon: weaponDiv,
                background: weaponBackground,
                image: weaponImage,
                indexBorder: weaponIndexBorder,
                index: weaponIndex,
                typeBorder: weaponTypeBorder,
                type: weaponType,
            });

            let canvas = document.createElement("canvas");
            let ctx = canvas.getContext("2d");
            let renderingWeapon = {
                id: i,
            } as Weapon;
            Player.prerenderWeapon(renderingWeapon);
            let image = renderingWeapon.prerenderCanvas;
            canvas.width = image.width;
            canvas.height = image.height;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(image, 0, 0);
            weaponImage.src = canvas.toDataURL("image/png");
            weaponIndexBorder.innerText = (weapon + 1).toString();
            weaponIndex.innerText = (weapon + 1).toString();
            weaponTypeBorder.innerText = Player.weaponData[i].type;
            weaponType.innerText = Player.weaponData[i].type;
        }
    }

    selectedBuild = build;
    selectedWeapon = weapon;

    // document.getElementById("weaponName").innerText = Player.weaponData[clientPlayer.builds[build][weapon].id].name;

    let type = "Unknown";
    switch (Player.weaponData[clientPlayer.builds[build][weapon].id].type) {
        case "AR":
            type = "Assault Rifle";
            break;
        case "MG":
            type = "Machine Gun";
            break;
        case "SG":
            type = "Shotgun";
            break;
        case "SR":
            type = "Sniper Rifle";
            break;
        case "RL":
            type = "Rocket Launcher";
            break;
        case "RG":
            type = "Railgun";
            break;
    }
    document.getElementById("weaponType").innerText = type;

    // weaponCustomizationInputs = new Map();
    // document.getElementById("weaponCustomizationInputs").innerHTML = "";
    // for (let i in Player.weaponData[clientPlayer.builds[build][weapon].id].customizations) {
    //     let customization = Player.weaponData[clientPlayer.builds[build][weapon].id].customizations[i];

    //     let div = document.createElement("div");
    //     div.classList.add("weaponCustomization");
    //     document.getElementById("weaponCustomizationInputs").appendChild(div);

    //     let span = document.createElement("span");
    //     span.classList.add("weaponCustomizationSpan");
    //     div.appendChild(span);

    //     let select = document.createElement("select");
    //     select.classList.add("weaponCustomizationSelect");
    //     select.oninput = () => {
    //         clientPlayer.builds[build][weapon].customizations[i] = select.value;
    //         updateCustomization(build, weapon, i);
    //         updateStats();
    //         updateBuildWeapon(build, weapon);
    //         socket.emit("buildCustomizations", {
    //             type: "customizations",
    //             build: build,
    //             weapon: weapon,
    //             customization: i,
    //             option: select.value,
    //         });
    //     };
    //     span.appendChild(select);

    //     for (let j in customization.options) {
    //         let option = document.createElement("option");
    //         option.value = j;
    //         option.innerText = customization.options[j].name;
    //         select.appendChild(option);
    //     }

    //     select.value = clientPlayer.builds[build][weapon].customizations[i];

    //     let description = document.createElement("div");
    //     description.classList.add("weaponCustomizationDescription");
    //     div.appendChild(description);

    //     let x = (customization.inputX - (clientPlayer.builds[build][weapon] as Weapon).prerenderMaxWidth / 2) * 64;
    //     let y = (customization.inputY - (clientPlayer.builds[build][weapon] as Weapon).prerenderMaxHeight / 2) * 64;
    //     weaponCustomizationInputs.set(i, {
    //         x: weaponCanvas.width / 2 + x * Math.cos(selectedWeaponRotation) + y * Math.sin(selectedWeaponRotation),
    //         y: weaponCanvas.height / 2 + y * Math.cos(selectedWeaponRotation) - x * Math.sin(selectedWeaponRotation),
    //         div: div,
    //         span: span,
    //         input: select,
    //         description: description,
    //     });
    //     div.style.left = weaponCustomizationInputs.get(i).x / devicePixelRatio + "px";
    //     div.style.top = weaponCustomizationInputs.get(i).y / devicePixelRatio + "px";
    //     updateCustomization(build, weapon, i);
    // }
    updateStats();
};

function updateCustomization(build: number, weapon: number, customization: string) {
    // let stats = Player.weaponData[clientPlayer.builds[build][weapon].id].customizations[customization].options[clientPlayer.builds[build][weapon].customizations[customization]];
    // let descriptionText = "";
    // if (stats.damage != null) {
    //     let color = "yellow";
    //     if (stats.damage < 1) {
    //         color = "red";
    //     }
    //     else if (stats.damage > 1) {
    //         color = "lime";
    //     }
    //     descriptionText += "<div style=\"color: " + color + ";\">x" + stats.damage + " damage</div>";
    // }
    // if (stats.critDamage != null) {
    //     let color = "yellow";
    //     if (stats.critDamage < 1) {
    //         color = "red";
    //     }
    //     else if (stats.critDamage > 1) {
    //         color = "lime";
    //     }
    //     descriptionText += "<div style=\"color: " + color + ";\">x" + stats.critDamage + " crit damage</div>";
    // }
    // if (stats.knockback != null) {
    //     let color = "yellow";
    //     if (stats.knockback < 1) {
    //         color = "red";
    //     }
    //     else if (stats.knockback > 1) {
    //         color = "lime";
    //     }
    //     descriptionText += "<div style=\"color: " + color + ";\">x" + stats.knockback + " knockback</div>";
    // }
    // if (stats.piercing != null) {
    //     let color = "yellow";
    //     if (stats.piercing < 1) {
    //         color = "red";
    //     }
    //     else if (stats.piercing > 1) {
    //         color = "lime";
    //     }
    //     descriptionText += "<div style=\"color: " + color + ";\">x" + stats.piercing + " piercing</div>";
    // }
    // if (stats.attackSpeed != null) {
    //     let color = "yellow";
    //     if (stats.attackSpeed < 1) {
    //         color = "lime";
    //     }
    //     else if (stats.attackSpeed > 1) {
    //         color = "red";
    //     }
    //     descriptionText += "<div style=\"color: " + color + ";\">x" + stats.attackSpeed + " attack interval</div>";
    // }
    // if (stats.projectileSpeed != null) {
    //     let color = "yellow";
    //     if (stats.projectileSpeed < 1) {
    //         color = "red";
    //     }
    //     else if (stats.projectileSpeed > 1) {
    //         color = "lime";
    //     }
    //     descriptionText += "<div style=\"color: " + color + ";\">x" + stats.projectileSpeed + " projectile speed</div>";
    // }
    // if (stats.projectileCount != null) {
    //     let color = "yellow";
    //     if (stats.projectileCount < 1) {
    //         color = "red";
    //     }
    //     else if (stats.projectileCount > 1) {
    //         color = "lime";
    //     }
    //     descriptionText += "<div style=\"color: " + color + ";\">x" + stats.projectileCount + " projectile count</div>";
    // }
    // if (stats.projectileSpread != null) {
    //     let color = "yellow";
    //     if (stats.projectileSpread < 1) {
    //         color = "lime";
    //     }
    //     else if (stats.projectileSpread > 1) {
    //         color = "red";
    //     }
    //     descriptionText += "<div style=\"color: " + color + ";\">x" + stats.projectileSpread + " projectile spread</div>";
    // }
    // if (stats.recoil != null) {
    //     let color = "yellow";
    //     if (stats.recoil < 1) {
    //         color = "lime";
    //     }
    //     else if (stats.recoil > 1) {
    //         color = "red";
    //     }
    //     descriptionText += "<div style=\"color: " + color + ";\">x" + stats.recoil + " recoil</div>";
    // }
    // if (stats.knockbackResistance != null) {
    //     let color = "yellow";
    //     if (stats.knockbackResistance < 1) {
    //         color = "red";
    //     }
    //     else if (stats.knockbackResistance > 1) {
    //         color = "lime";
    //     }
    //     descriptionText += "<div style=\"color: " + color + ";\">x" + stats.knockbackResistance + " knockback resistance</div>";
    // }
    // if (stats.ammoMax != null) {
    //     let color = "yellow";
    //     if (stats.ammoMax < 1) {
    //         color = "red";
    //     }
    //     else if (stats.ammoMax > 1) {
    //         color = "lime";
    //     }
    //     descriptionText += "<div style=\"color: " + color + ";\">x" + stats.ammoMax + " max ammo</div>";
    // }
    // if (stats.reloadSpeed != null) {
    //     let color = "yellow";
    //     if (stats.reloadSpeed < 1) {
    //         color = "lime";
    //     }
    //     else if (stats.reloadSpeed > 1) {
    //         color = "red";
    //     }
    //     descriptionText += "<div style=\"color: " + color + ";\">x" + stats.reloadSpeed + " reload time</div>";
    // }
    // weaponCustomizationInputs.get(customization).description.innerHTML = descriptionText;
};

let stats: {
    [key: string]: {
        name: string,
        default?: number,
        unit?: string,
        addLine?: boolean,
    },
} = {
    // moveSpeed: {
    //     name: "Move Speed",
    //     default: 2.5,
    //     unit: " pixel(s)/tick",
    //     addLine: true,
    // },
    // jumpHeight: {
    //     name: "Jump Height",
    //     default: 20,
    //     unit: " pixel(s)",
    // },
    // stepHeight: {
    //     name: "Step Height",
    //     default: 2,
    //     unit: " pixel(s)",
    // },
    // gravity: {
    //     name: "Gravity",
    //     default: 0.25,
    //     unit: " pixel(s)/tick^2",
    // },
    // hp: {
    //     name: "Health",
    //     default: 100,
    //     addLine: true,
    // },
    // hpRegen: {
    //     name: "Health Regen",
    //     default: 0.02,
    //     unit: "/tick",
    // },
    damage: {
        name: "Damage",
        addLine: true,
    },
    critDamage: {
        name: "Crit Damage",
    },
    knockback: {
        name: "Knockback",
        unit: " pixel(s)/tick",
    },
    piercing: {
        name: "Piercing",
        unit: " target(s)",
    },
    attackSpeed: {
        name: "Attack Interval",
        unit: " tick(s)",
    },
    projectileSpeed: {
        name: "Projectile Speed",
        unit: " pixel(s)/tick",
    },
    projectileCount: {
        name: "Projectile Count",
    },
    projectileSpread: {
        name: "Projectile Spread",
        unit: " degree(s)",
    },
    recoil: {
        name: "Recoil",
        unit: " pixel(s)/tick",
    },
    knockbackResistance: {
        name: "Knockback Resistance",
    },
    ammoMax: {
        name: "Max Ammo",
    },
    reloadSpeed: {
        name: "Reload Time",
        unit: " tick(s)",
    },
};
let statDivs: Map<string, {
    label: HTMLDivElement,
    value: HTMLDivElement,
}> = new Map();

function initStats() {
    for (let i in stats) {
        // if (stats[i].addLine) {
        //     let line = document.createElement("div");
        //     line.classList.add("weaponStatLine");
        //     document.getElementById("weaponStats").appendChild(line);
        // }
        let tr = document.createElement("tr");
        document.getElementById("weaponStats").appendChild(tr);

        let label = document.createElement("td");
        label.classList.add("weaponStatLabel");
        label.innerText = stats[i].name + ":";
        tr.appendChild(label);

        let value = document.createElement("td");
        value.classList.add("weaponStatValue");
        value.innerText = "--";
        tr.appendChild(value);

        statDivs.set(i, {
            label: label,
            value: value,
        });
    }
};
function updateStats() {
    if (selectedWeapon == null) {
        return;
    }
    for (let i in stats) {
        let value = stats[i].default;
        let weapon = Player.weaponData[clientPlayer.builds[selectedBuild][selectedWeapon].id];
        if (value == null) {
            value = weapon[i as keyof WeaponData] as number;
        }
        // for (let j in clientPlayer.builds[selectedBuild][selectedWeapon].customizations) {
        //     let customization = weapon.customizations[j].options[clientPlayer.builds[selectedBuild][selectedWeapon].customizations[j]];
        //     for (let k in customization) {
        //         if (k == i) {
        //             value *= customization[k as keyof typeof customization] as number;
        //         }
        //     }
        // }
        value = Math.round(value * 100) / 100;
        let text = value.toString();
        if (stats[i].unit != null) {
            text += stats[i].unit.replaceAll("(s)", value == 1 ? "" : "s");
        }
        statDivs.get(i).value.innerText = text;
    }
};

initStats();

let selectedWeaponRotation = 0;
let selectedWeaponRotationSpeed = 0;

// let weaponCustomizationInputs: Map<string, {
//     x: number,
//     y: number,
//     div: HTMLDivElement,
//     span: HTMLSpanElement,
//     input: HTMLSelectElement,
//     description: HTMLDivElement,
// }> = new Map();

function updateSelectedWeapon() {
    if (selectedWeapon == null) {
        return;
    }

    if (mouseDown) {
        let rect = weaponCanvas.getBoundingClientRect();
        let startAngle = Math.atan2(lastMouseY - rect.y - weaponCanvas.height / 2, lastMouseX - rect.x - weaponCanvas.width / 2);
        let endAngle = Math.atan2(mouseY - rect.y - weaponCanvas.height / 2, mouseX - rect.x - weaponCanvas.width / 2);
        selectedWeaponRotationSpeed = endAngle - startAngle;
        if (selectedWeaponRotationSpeed > Math.PI) {
            selectedWeaponRotationSpeed -= Math.PI * 2;
        }
        if (selectedWeaponRotationSpeed < -Math.PI) {
            selectedWeaponRotationSpeed += Math.PI * 2;
        }
    }
    lastMouseX = mouseX;
    lastMouseY = mouseY;

    selectedWeaponRotation += selectedWeaponRotationSpeed;
    selectedWeaponRotationSpeed *= 0.9;

    let weapon = clientPlayer.builds[selectedBuild][selectedWeapon] as Weapon;
    
    // for (let [i, input] of weaponCustomizationInputs) {
    //     let customization = Player.weaponData[weapon.id].customizations[i];
    //     let x = (customization.inputX - weapon.prerenderMaxWidth / 2) * 64;
    //     let y = (customization.inputY - weapon.prerenderMaxHeight / 2) * 64;
    //     weaponCustomizationInputs.set(i, {
    //         x: weaponCanvas.width / 2 + x * Math.cos(selectedWeaponRotation) - y * Math.sin(selectedWeaponRotation),
    //         y: weaponCanvas.height / 2 + y * Math.cos(selectedWeaponRotation) + x * Math.sin(selectedWeaponRotation),
    //         div: input.div,
    //         span: input.span,
    //         input: input.input,
    //         description: input.description,
    //     });
    //     input.div.style.left = input.x / devicePixelRatio + "px";
    //     input.div.style.top = input.y / devicePixelRatio + "px";
    // }
};
function drawSelectedWeapon() {
    weaponCtx.clearRect(0, 0, weaponCanvas.width, weaponCanvas.height);
    if (selectedWeapon == null) {
        return;
    }
    weaponCtx.translate(weaponCanvas.width / 2, weaponCanvas.height / 2);
    weaponCtx.scale(64, 64);
    weaponCtx.rotate(selectedWeaponRotation);
    let weapon = clientPlayer.builds[selectedBuild][selectedWeapon] as Weapon;
    weaponCtx.drawImage(weapon.prerenderCanvas, weapon.prerenderOffsetX - weapon.prerenderMaxWidth / 2, weapon.prerenderOffsetY - weapon.prerenderMaxHeight / 2, weapon.prerenderCanvas.width, weapon.prerenderCanvas.height);
    weaponCtx.resetTransform();
};

let lastMouseX = 0;
let lastMouseY = 0;

let mouseDown = false;

weaponCanvas.onmousedown = (e) => {
    if (e.button == 0) {
        mouseDown = true;
    }
};
document.addEventListener("mouseup", (e) => {
    mouseDown = false;
});

let buildCustomizationScreen = document.getElementById("buildCustomizationScreen");
function updateBuildCustomizationFrame() {
    if (buildCustomizationScreen.style.display == "none") {
        window.requestAnimationFrame(updateBuildCustomizationFrame);
        return;
    }

    // hacky fix
    if (weaponCanvas.width == 0) {
        onResize();
    }
    
    updateSelectedWeapon();
    drawSelectedWeapon();

    window.requestAnimationFrame(updateBuildCustomizationFrame);
};
window.requestAnimationFrame(updateBuildCustomizationFrame);

export { initAllBuildWeapons, updatePreviewWeapon };