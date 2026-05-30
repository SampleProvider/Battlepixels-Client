import { socket } from "../../index.js";
import { selectWeapon } from "./hud.js";
import { WeaponItem } from "./item.js";

class Inventory {
    weapons: WeaponItem[] = [];
    weaponDivs: HTMLDivElement[] = [];
    equipSlots: number = 1;
    equippedWeaponDivs: HTMLDivElement[] = [];
    equippedIndices: number[] = [];

    selectedEquipSlot: number = 0;

    setInventory(weapons: WeaponItem[], equipSlots: number, equippedIndices: number[]) {
        this.weapons = weapons;
        this.weaponDivs = [];
        this.equipSlots = equipSlots;
        this.equippedWeaponDivs = [];
        for (let i = 0; i < this.equipSlots; i++) {
            this.equippedIndices[i] = equippedIndices[i] ?? 0;
        }
        document.getElementById("equippedWeapons").innerHTML = "";
        document.getElementById("unequippedWeapons").innerHTML = "";
        for (let i = 0; i < this.weapons.length; i++) {
            this.createUnequippedWeaponDiv(i);
        }
        for (let i = 0; i < this.equipSlots; i++) {
            this.createEquippedWeaponDiv(i);
        }
        this.equippedWeaponDivs[this.selectedEquipSlot].classList.add("selected");
        for (let i in this.weapons) {
            if (WeaponItem.getEquipSlot(WeaponItem.data[this.weapons[i].id].type) == this.selectedEquipSlot) {
                this.weaponDivs[i].style.display = "revert-layer";
            }
            else {
                this.weaponDivs[i].style.display = "none";
            }
        }
        WeaponItem.setInfo(this.weapons[this.equippedIndices[this.selectedEquipSlot]], null, this.weaponDivs[this.equippedIndices[this.selectedEquipSlot]], document.getElementById("equippedWeaponInfo") as HTMLDivElement);
        document.getElementById("unequippedWeaponInfo").style.visibility = "hidden";
    }

    addWeapon(weapon: WeaponItem) {
        this.weapons.push(weapon);
        this.createUnequippedWeaponDiv(this.weapons.length - 1);
    }
    
    equipWeapon(index: number) {
        let weapon = this.weapons[index];
        let slot = WeaponItem.getEquipSlot(WeaponItem.data[weapon.id].type);
        this.weaponDivs[this.equippedIndices[slot]].classList.remove("selected");
        this.equippedIndices[slot] = index;
        this.weaponDivs[this.equippedIndices[slot]].classList.add("selected");
        this.updateEquippedWeaponDiv(slot);
        WeaponItem.setInfo(this.weapons[this.equippedIndices[this.selectedEquipSlot]], null, this.weaponDivs[this.equippedIndices[this.selectedEquipSlot]], document.getElementById("equippedWeaponInfo") as HTMLDivElement);
    }

    createEquippedWeaponDiv(slot: number) {
        let div = WeaponItem.createDiv(this.weapons[this.equippedIndices[slot]]);
        div.onclick = () => {
            this.updateSelectedEquipSlot(slot);
            selectWeapon(slot);
        };
        document.getElementById("equippedWeapons").appendChild(div);
        this.equippedWeaponDivs.splice(slot, 0, div);
        this.updateEquippedWeaponDiv(slot);
        this.weaponDivs[this.equippedIndices[slot]].classList.add("selected");
    }
    updateEquippedWeaponDiv(slot: number) {
        WeaponItem.updateDiv(this.weapons[this.equippedIndices[slot]], this.equippedWeaponDivs[slot]);
    }

    createUnequippedWeaponDiv(index: number) {
        let weapon = this.weapons[index];
        let div = WeaponItem.createDiv(weapon);
        div.onclick = () => {
            for (let i = 0; i < this.weapons.length; i++) {
                if (this.weapons[i] == weapon) {
                    socket.emit("equipWeapon", {
                        index: i,
                    });
                    break;
                }
            }
        };
        div.onmouseover = (e) => {
            WeaponItem.setInfo(weapon, this.weapons[this.equippedIndices[WeaponItem.getEquipSlot(WeaponItem.data[weapon.id].type)]], div, document.getElementById("unequippedWeaponInfo") as HTMLDivElement);
            document.getElementById("unequippedWeaponInfo").style.visibility = "visible";
        };
        document.getElementById("unequippedWeapons").appendChild(div);
        this.weaponDivs.splice(index, 0, div);
        this.updateUnequippedWeaponDiv(index);
    }
    updateUnequippedWeaponDiv(index: number) {
        WeaponItem.updateDiv(this.weapons[index], this.weaponDivs[index]);
    }

    updateSelectedEquipSlot(slot: number) {
        this.equippedWeaponDivs[this.selectedEquipSlot].classList.remove("selected");
        this.selectedEquipSlot = slot;
        this.equippedWeaponDivs[this.selectedEquipSlot].classList.add("selected");
        for (let i in this.weapons) {
            if (WeaponItem.getEquipSlot(WeaponItem.data[this.weapons[i].id].type) == this.selectedEquipSlot) {
                this.weaponDivs[i].style.display = "revert-layer";
            }
            else {
                this.weaponDivs[i].style.display = "none";
            }
        }
        WeaponItem.setInfo(this.weapons[this.equippedIndices[this.selectedEquipSlot]], null, this.weaponDivs[this.equippedIndices[this.selectedEquipSlot]], document.getElementById("equippedWeaponInfo") as HTMLDivElement);
        document.getElementById("unequippedWeaponInfo").style.visibility = "hidden";
    }
}

let inventory = new Inventory();

socket.on("setInventory", (data) => {
    inventory.setInventory(data.weapons, data.equipSlots, data.equippedIndices);
});
socket.on("addItem", (data) => {
    inventory.addWeapon(data);
});
socket.on("equipWeapon", (data) => {
    inventory.equipWeapon(data.index);
});

export { Inventory, inventory };