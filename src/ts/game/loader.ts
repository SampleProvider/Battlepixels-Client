import { Projectile } from "../entity/projectile.js";
import { Npc } from "../entity/npc.js";
import { Monster } from "../entity/monster.js";
import { StaticMap } from "../map/map.js";
import { Cloud } from "../map/cloud.js";
import { WeaponItem } from "../ui/item.js";
import { loadPerks } from "../ui/perks.js";
// import { loadQuests } from "../ui/quest.js";
import { socket } from "../../index.js";
import { loadChangelog } from "../ui/changelog.js";

let images = new Map<string, HTMLImageElement>();

function loadImage(id: string, src: string) {
    let image = new Image();
    image.src = "/src/img/" + src;
    images.set(id, image);
};

loadImage("player_uv_lookup", "player_uv_lookup.png");
loadImage("player_uv_source", "player_uv_source.png");
loadImage("player_color_lookup", "player_color_lookup.png");
loadImage("healthbar", "healthbar.png");
loadImage("gravestone", "gravestone.png");
loadImage("parallax_background", "parallax_background.png");
loadImage("tileset_terrains", "tileset_terrains.png");
loadImage("tileset_plants", "tileset_plants.png");
loadImage("tileset_decorations", "tileset_decorations.png");
loadImage("tileset_special", "tileset_special.png");

let loaded = false;

async function load() {
    try {
        await Projectile.load();
        await Npc.load();
        await Monster.load();
        await StaticMap.loadTileset("tileset_terrains");
        await StaticMap.loadTileset("tileset_plants");
        await StaticMap.loadTileset("tileset_decorations");
        await StaticMap.loadTileset("tileset_special");
        await Cloud.load();
        await WeaponItem.load();
        await loadChangelog();
        await loadPerks();
        // await loadQuests();
        loaded = true;
    }
    catch (err) {
        await new Promise((res) => {
            setTimeout(res, 10);
        });
        await load();
    }
};

load();

export { images, loaded };