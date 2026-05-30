import { Pixel, pixels } from "./pixels.js";
import { StaticMap, CollectiblePerk, Light, KeybindDisplay } from "./map.js";
import { images } from "../game/loader.js";
import { unlockedPerks } from "../ui/perks.js";
import { clientPlayer } from "../entity/client-player.js";
import { createNoise2D } from "simplex-noise";

let noise = createNoise2D();

class MapRenderer {
    map: StaticMap = null;

    setMap(map: StaticMap) {
        this.map = map;
        map.renderer = this;
    }

    getTileId(id: number) {
        let tilesetId: string;
        for (let i = 0; i < this.map.tilesets.length; i++) {
            if (id < this.map.tilesets[i].firstTileId) {
                return [id - this.map.tilesets[i - 1].firstTileId, tilesetId];
            }
            tilesetId = this.map.tilesets[i].id;
        }
        return [id - this.map.tilesets[this.map.tilesets.length - 1].firstTileId, tilesetId];
    }
    drawTile(ctx: OffscreenCanvasRenderingContext2D, layer: number, x: number, y: number) {
        let [id, tilesetId] = this.getTileId(this.map.layers[layer].data[x + y * this.map.width] - 1) as [number, string];
        let tileset = StaticMap.tilesetData[tilesetId];
        ctx.drawImage(images.get(tilesetId), (id % tileset.columns) * 8, Math.floor(id / tileset.columns) * 8, 8, 8, x * 8, y * 8, 8, 8);
        if (tileset.data.has(id) && tileset.data.get(id).autoTerrain == true) {
            let pattern = 0;
            for (let y1 = -1; y1 <= 1; y1++) {
                for (let x1 = -1; x1 <= 1; x1++) {
                    if (x1 == 0 && y1 == 0) {
                        continue;
                    }
                    let powerLookup = [
                        [7, 0, 1],
                        [6, -1, 2],
                        [5, 4, 3],
                    ];
                    let power = Math.pow(2, powerLookup[y1 + 1][x1 + 1]);
                    if (x + x1 < 0 || x + x1 >= this.map.width || y + y1 < 0 || y + y1 >= this.map.height) {
                        pattern += power;
                        continue;
                    }
                    if (this.map.layers[layer].data[x + x1 + (y + y1) * this.map.width] == 0) {
                        continue;
                    }
                    let [id2, tilesetId2] = this.getTileId(this.map.layers[layer].data[x + x1 + (y + y1) * this.map.width] - 1) as [number, string];
                    let tileset2 = StaticMap.tilesetData[tilesetId2];
                    if (id2 == id || (tileset2.data.has(id2) && tileset2.data.get(id2).autoTerrainId != null && tileset2.data.get(id2).autoTerrainId == tileset.data.get(id).autoTerrainId)) {
                        let power2 = Math.pow(2, powerLookup[1 - y1][1 - x1]);
                        if (!tileset2.data.has(id2) || (tileset2.data.get(id2).autoTerrainPattern & power2) == power2) {
                            pattern += power;
                        }
                    }
                }
            }
            let patternLookup: {
                x: number,
                y: number,
                data: { [key: number]: number[] },
            }[] = [
                {
                    x: 0,
                    y: 0,
                    data: {
                        0: [0, 0],
                        64: [1, 0],
                        1: [0, 1],
                        193: null,
                        65: [1, 1],
                    },
                },
                {
                    x: 1,
                    y: 0,
                    data: {
                        0: [1, 0],
                        1: [1, 1],
                        4: [0, 0],
                        7: null,
                        5: [0, 1],
                    },
                },
                {
                    x: 1,
                    y: 1,
                    data: {
                        0: [1, 1],
                        4: [0, 1],
                        16: [1, 0],
                        28: null,
                        20: [0, 0],
                    },
                },
                {
                    x: 0,
                    y: 1,
                    data: {
                        0: [0, 1],
                        16: [0, 0],
                        64: [1, 1],
                        112: null,
                        80: [1, 0],
                    },
                },
            ];
            pattern |= 255 - tileset.data.get(id).autoTerrainPattern;
            // perfect triangles
            // looks kind of bad
            // let prerenderCanvas = new OffscreenCanvas(8, 8);
            // let prerenderCtx = prerenderCanvas.getContext("2d");
            // prerenderCtx.drawImage(images.get(tilesetId), (id % tileset.columns) * 8, Math.floor(id / tileset.columns) * 8, 8, 8, 0, 0, 8, 8);
            // prerenderCtx.globalCompositeOperation = "source-atop";
            for (let i in patternLookup) {
                let max = 0;
                let maxIndex = 0;
                for (let j in patternLookup[i].data) {
                    let value = pattern & Number(j);
                    if (value == Number(j) && value > max) {
                        max = value;
                        maxIndex = Number(j);
                    }
                }
                if (patternLookup[i].data[maxIndex] != null) {
                    let id2 = tileset.data.get(id).autoTerrainIndex;
                    // prerenderCtx.drawImage(images.get(tilesetId), (id2 % tileset.columns) * 8 + patternLookup[i].x * 4 + patternLookup[i].data[maxIndex][0] * 8, Math.floor(id2 / tileset.columns) * 8 + 8 + patternLookup[i].y * 4 + patternLookup[i].data[maxIndex][1] * 8, 4, 4, patternLookup[i].x * 4, patternLookup[i].y * 4, 4, 4);
                    ctx.drawImage(images.get(tilesetId), (id2 % tileset.columns) * 8 + patternLookup[i].x * 4 + patternLookup[i].data[maxIndex][0] * 8, Math.floor(id2 / tileset.columns) * 8 + 8 + patternLookup[i].y * 4 + patternLookup[i].data[maxIndex][1] * 8, 4, 4, x * 8 + patternLookup[i].x * 4, y * 8 + patternLookup[i].y * 4, 4, 4);
                }
            }
            // ctx.drawImage(prerenderCanvas, x * 8, y * 8, 8, 8);
        }
    }
    
    updateCollectiblePerk(collectiblePerk: CollectiblePerk, frameTime: number) {
        let collected = unlockedPerks.has(collectiblePerk.perkId);
        if (collectiblePerk.rotation == null) {
            collectiblePerk.rotation = 0;
        }
        if (collectiblePerk.speedRotation == null) {
            collectiblePerk.speedRotation = 0.05;
        }
        if (collectiblePerk.scale == null) {
            collectiblePerk.scale = 1;
        }
        let distance = Math.sqrt(Math.pow(clientPlayer.x - collectiblePerk.x, 2) + Math.pow(clientPlayer.y - collectiblePerk.y, 2));
        let distanceFactor = Math.exp(-Math.pow(distance / 64, 2));
        if (clientPlayer.collectingPerk != null && clientPlayer.collectingPerk.perkId == collectiblePerk.perkId) {
            distanceFactor += clientPlayer.collectingPerkTime / 90;
        }
        else if (collected) {
            distanceFactor = -0.5;
        }
        collectiblePerk.speedRotation = collectiblePerk.speedRotation * Math.pow(0.9, frameTime) + (0.05 + distanceFactor * 0.1) * (1 - Math.pow(0.9, frameTime));
        collectiblePerk.rotation += collectiblePerk.speedRotation * frameTime;
        collectiblePerk.scale = collectiblePerk.scale * Math.pow(0.9, frameTime) + (distanceFactor + 1) * (1 - Math.pow(0.9, frameTime));
        if (collectiblePerk.particles == null) {
            collectiblePerk.particles = [];
            for (let i = 0; i < 16; i++) {
                collectiblePerk.particles.push({
                    noiseTime: 0,
                    magnitude: Math.random(),
                    rotation: Math.random() * Math.PI * 2,
                    size: Math.random(),
                });
            }
        }
        for (let i = 0; i < collectiblePerk.particles.length; i++) {
            collectiblePerk.particles[i].noiseTime += frameTime / 120;
            collectiblePerk.particles[i].magnitude = noise(collectiblePerk.particles[i].noiseTime, i * 3) * 16;
            collectiblePerk.particles[i].rotation = noise(collectiblePerk.particles[i].noiseTime, i * 3 + 1);
            collectiblePerk.particles[i].size = noise(collectiblePerk.particles[i].noiseTime, i * 3 + 2) + 1;
        }
    }
    drawCollectiblePerk(collectiblePerk: CollectiblePerk, belowCtx: OffscreenCanvasRenderingContext2D, aboveCtx: OffscreenCanvasRenderingContext2D) {
        let size = (collectiblePerk.scale + 4) * 2;
        let gradient = belowCtx.createRadialGradient(collectiblePerk.x, collectiblePerk.y, 0, collectiblePerk.x, collectiblePerk.y, size);
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(1, "#ffffff00");
        belowCtx.fillStyle = gradient;
        belowCtx.fillRect(collectiblePerk.x - size, collectiblePerk.y - size, size * 2, size * 2);

        belowCtx.fillStyle = "#000000";
        belowCtx.strokeStyle = "#ffffff";
        for (let i in collectiblePerk.particles) {
            belowCtx.save();
            belowCtx.translate(collectiblePerk.x + Math.cos(collectiblePerk.particles[i].rotation) * collectiblePerk.particles[i].magnitude * collectiblePerk.scale, collectiblePerk.y + Math.sin(collectiblePerk.particles[i].rotation) * collectiblePerk.particles[i].magnitude * collectiblePerk.scale);
            belowCtx.rotate(collectiblePerk.rotation + collectiblePerk.particles[i].rotation);
            let size = collectiblePerk.particles[i].size * collectiblePerk.scale;
            belowCtx.lineWidth = 1;
            belowCtx.strokeRect(-size / 2, -size / 2, size, size);
            belowCtx.fillRect(-size / 2, -size / 2, size, size);
            belowCtx.restore();
        }
        belowCtx.lineWidth = 2;
        belowCtx.beginPath();
        for (let i = 0; i < 8; i++) {
            let angle = collectiblePerk.rotation + Math.PI / 4 * i;
            let magnitude = Math.sin(performance.now() / 1000 + Math.PI * i) * Math.min(collectiblePerk.scale, 2) + 4;
            magnitude *= collectiblePerk.scale;
            if (i == 0) {
                belowCtx.moveTo(collectiblePerk.x + Math.cos(angle) * magnitude, collectiblePerk.y + Math.sin(angle) * magnitude);
            }
            else {
                belowCtx.lineTo(collectiblePerk.x + Math.cos(angle) * magnitude, collectiblePerk.y + Math.sin(angle) * magnitude);
            }
        }
        belowCtx.closePath();
        belowCtx.stroke();
        belowCtx.fill();
    }

    drawKeybindDisplay(object: KeybindDisplay, belowCtx: OffscreenCanvasRenderingContext2D, aboveCtx: OffscreenCanvasRenderingContext2D) {
        aboveCtx.fillStyle = "#ffffff";
        aboveCtx.strokeStyle = "#000000";
        aboveCtx.lineWidth = 1;
        aboveCtx.lineJoin = "miter";
        aboveCtx.lineCap = "square";
        aboveCtx.font = "4px Google Sans Normal";
        aboveCtx.textAlign = "center";
        aboveCtx.textBaseline = "middle";
        let key = "-";
        switch (object.keybindId) {
            case "left":
                key = "A";
                break;
            case "right":
                key = "D";
                break;
            case "up":
                key = "W";
                break;
            case "down":
                key = "S";
                break;
            case "1":
                key = "1";
                break;
        }
        aboveCtx.strokeText(key, object.x, object.y + 0.25);
        aboveCtx.fillText(key, object.x, object.y + 0.25);
        aboveCtx.lineJoin = "round";
        aboveCtx.lineCap = "round";
        aboveCtx.lineWidth = 1.5;
        aboveCtx.strokeStyle = "#000000";
        aboveCtx.strokeRect(object.x - 3, object.y - 3, 6, 6);
        aboveCtx.lineWidth = 0.5;
        aboveCtx.strokeStyle = "#ffffff";
        aboveCtx.strokeRect(object.x - 3, object.y - 3, 6, 6);
    }

    updateAll(frameTime: number) {
        for (let i in this.map.collectiblePerks) {
            this.updateCollectiblePerk(this.map.collectiblePerks[i], frameTime);
        }
    }
    drawAll(belowCtx: OffscreenCanvasRenderingContext2D, aboveCtx: OffscreenCanvasRenderingContext2D) {
        // if (this instanceof OffscreenCanvasMapRenderer && Light.list.size > 0) {
        //     let occlusionImageData = this.occlusionCtx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
        //     let entityOcclusionImageData = this.entityOcclusionCtx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
        //     for (let [_, light] of Light.list) {
        //         this.drawLight(light, occlusionImageData, entityOcclusionImageData);
        //     }
        // }
        for (let i in this.map.collectiblePerks) {
            this.drawCollectiblePerk(this.map.collectiblePerks[i], belowCtx, aboveCtx);
        }
        for (let i in this.map.renderableObjects) {
            if (this.map.renderableObjects[i].type == "keybindDisplay") {
                this.drawKeybindDisplay(this.map.renderableObjects[i], belowCtx, aboveCtx);
            }
        }
    }
}
class OffscreenCanvasMapRenderer extends MapRenderer {
    canvas: OffscreenCanvas = null;
    ctx: OffscreenCanvasRenderingContext2D = null;

    parallaxCanvas: OffscreenCanvas = null;
    parallaxCtx: OffscreenCanvasRenderingContext2D = null;

    backgroundCanvas: OffscreenCanvas = null;
    backgroundCtx: OffscreenCanvasRenderingContext2D = null;
    
    occlusionCanvas: OffscreenCanvas = null;
    occlusionCtx: OffscreenCanvasRenderingContext2D = null;
    
    entityOcclusionCanvas: OffscreenCanvas = null;
    entityOcclusionCtx: OffscreenCanvasRenderingContext2D = null;
    
    lightCanvas: OffscreenCanvas = null;
    lightCtx: OffscreenCanvasRenderingContext2D = null;
    
    entityLightCanvas: OffscreenCanvas = null;
    entityLightCtx: OffscreenCanvasRenderingContext2D = null;

    setMap(map: StaticMap) {
        super.setMap(map);
        this.canvas = new OffscreenCanvas(this.map.width * 8, this.map.height * 8);
        this.ctx = this.canvas.getContext("2d");
        this.parallaxCanvas = new OffscreenCanvas(this.map.width * 4, this.map.height * 4);
        this.parallaxCtx = this.parallaxCanvas.getContext("2d");
        this.backgroundCanvas = new OffscreenCanvas(this.map.width * 8, this.map.height * 8);
        this.backgroundCtx = this.backgroundCanvas.getContext("2d");
        this.occlusionCanvas = new OffscreenCanvas(this.map.width * 8, this.map.height * 8);
        this.occlusionCtx = this.occlusionCanvas.getContext("2d", { willReadFrequently: true });
        this.entityOcclusionCanvas = new OffscreenCanvas(this.map.width * 8, this.map.height * 8);
        this.entityOcclusionCtx = this.entityOcclusionCanvas.getContext("2d", { willReadFrequently: true });
        this.lightCanvas = new OffscreenCanvas(this.map.width * 8, this.map.height * 8);
        this.lightCtx = this.lightCanvas.getContext("2d");
        this.entityLightCanvas = new OffscreenCanvas(this.map.width * 8, this.map.height * 8);
        this.entityLightCtx = this.entityLightCanvas.getContext("2d");

        this.draw();
    }
    updatePixel(x: number, y: number) {
        // for (let y = Math.max(y1 - 1, 0); y <= Math.min(y1 + 1, this.map.height - 1); y++) {
        //     for (let x = Math.max(x1 - 1, 0); x <= Math.min(x1 + 1, this.map.width - 1); x++) {
                // if (pixels[this.map.grid[y][x]].id == "water") {
                //     let air = getTouching(this.map, x, y, pixelData.air.index);
                //     let noise = air;
                //     this.ctx.fillStyle = "rgba(" + (pixels[this.map.grid[y][x]].color[0] + noise * pixels[this.map.grid[y][x]].noise[0]) + ", " + (pixels[this.map.grid[y][x]].color[1] + noise * pixels[this.map.grid[y][x]].noise[1]) + ", " + (pixels[this.map.grid[y][x]].color[2] + noise * pixels[this.map.grid[y][x]].noise[2]) + ", " + (pixels[this.map.grid[y][x]].color[3] + noise * pixels[this.map.grid[y][x]].noise[3]) + ")";
                // }
                // let id = this.map.grid[(x + y * this.map.width) * this.map.stride + Pixel.Id];
                // if (pixels[id].noise != null) {
                //     let noise = Math.random() * 2 - 1;
                //     this.ctx.fillStyle = "rgba(" + (pixels[id].color[0] + noise * pixels[id].noise[0]) + ", " + (pixels[id].color[1] + noise * pixels[id].noise[1]) + ", " + (pixels[id].color[2] + noise * pixels[id].noise[2]) + ", " + (pixels[id].color[3] + noise * pixels[id].noise[3]) + ")";
                // }
                // else {
                //     this.ctx.fillStyle = "rgba(" + pixels[id].color[0] + ", " + pixels[id].color[1] + ", " + pixels[id].color[2] + ", " + pixels[id].color[3] + ")";
                // }
                // this.ctx.fillRect(x, y, 1, 1);
        //     }
        // }
    }
    draw() {
        let gradient = this.backgroundCtx.createLinearGradient(0, 0, 0, this.map.height * 8);
        gradient.addColorStop(0, "rgb(225, 240, 255)");
        gradient.addColorStop(1, "rgb(180, 180, 255)");
        this.backgroundCtx.fillStyle = gradient;
        this.backgroundCtx.fillRect(0, 0, this.map.width * 8, this.map.height * 8);
        for (let i = 0; i < this.map.layers.length; i++) {
            if (!this.map.layers[i].visible) {
                continue;
            }
            if (this.map.layers[i].parallax) {
                this.parallaxCtx.globalAlpha = this.map.layers[i].opacity;
            }
            else {
                this.ctx.globalAlpha = this.map.layers[i].opacity;
            }
            if (this.map.layers[i].parallaxBackground) {
                this.parallaxCtx.globalCompositeOperation = "source-atop";
                this.parallaxCtx.drawImage(this.backgroundCanvas, 0, 0, this.map.width * 8, this.map.height * 8);
                this.parallaxCtx.globalCompositeOperation = "source-over";
                continue;
            }
            for (let y = 0; y < this.map.height; y++) {
                for (let x = 0; x < this.map.width; x++) {
                    if (this.map.layers[i].data[x + y * this.map.width] == 0) {
                        continue;
                    }
                    if (this.map.layers[i].parallax) {
                        this.drawTile(this.parallaxCtx, i, x, y);
                    }
                    else {
                        this.drawTile(this.ctx, i, x, y);
                        let [id, tilesetId] = this.getTileId(this.map.layers[i].data[x + y * this.map.width] - 1) as [number, string];
                        let tileset = StaticMap.tilesetData[tilesetId];
                        if (!tileset.data.has(id) || tileset.data.get(id).occlusion != false) {
                            this.occlusionCtx.drawImage(images.get(tilesetId), (id % tileset.columns) * 8, Math.floor(id / tileset.columns) * 8, 8, 8, x * 8, y * 8, 8, 8);
                        }
                    }
                }
            }
        }
        this.ctx.globalAlpha = 1;
        this.parallaxCtx.globalAlpha = 1;
    }
    drawLight(light: Light, occlusionImageData: ImageDataArray, entityOcclusionImageData: ImageDataArray) {
        let rays = light.spread / Math.PI * 180;

        // this.lightCtx.strokeStyle = "rgba(" + light.color[0] + ", " + light.color[1] + ", " + light.color[2] + ", " + light.intensity / rays + ")";
        this.lightCtx.strokeStyle = "rgba(" + light.color[0] + ", " + light.color[1] + ", " + light.color[2] + ", " + light.intensity * 0.02 + ")";
        this.lightCtx.beginPath();
        for (let i = 0; i < rays; i++) {
            let angle = light.rotation + (i - (rays - 1) / 2) * light.spread / (rays - 1);
            let x = light.x;
            let y = light.y;
            this.lightCtx.moveTo(x, y);
            let speedX = Math.cos(angle);
            let speedY = Math.sin(angle);
            let times = 0;
            let intensity = light.intensity;
            while (times < 1000) {
                let planeX = Math.max(Math.sign(speedX), -1e-10);
                let planeY = Math.max(Math.sign(speedY), -1e-10);
                let xDistance = (planeX - (x - Math.floor(x))) / speedX;
                let yDistance = (planeY - (y - Math.floor(y))) / speedY;

                if (!isFinite(xDistance)) {
                    xDistance = Infinity;
                }
                if (!isFinite(yDistance)) {
                    yDistance = Infinity;
                }
                
                let distance = Math.min(xDistance, yDistance);

                let decay = 0.001;

                let index = Math.floor(x) + Math.floor(y) * this.canvas.width;

                // let occlusionImageData = this.occlusionCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
                // let entityOcclusionImageData = this.entityOcclusionCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
                // let index = 0;
                let occlusion = occlusionImageData[index * 4 + 3] / 255;
                if (occlusion != 0) {
                    this.lightCtx.fillStyle = "rgba(" + light.color[0] + ", " + light.color[1] + ", " + light.color[2] + ", " + intensity * occlusion * 0.25 + ")";
                    this.lightCtx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
                    decay += 0.1 * occlusion;
                }
                let entityOcclusion = entityOcclusionImageData[index * 4 + 3] / 255;
                if (entityOcclusion != 0) {
                    this.entityLightCtx.fillStyle = "rgba(" + light.color[0] + ", " + light.color[1] + ", " + light.color[2] + ", " + intensity * entityOcclusion * 0.25 + ")";
                    this.entityLightCtx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
                    decay += 0.1 * entityOcclusion;
                }

                if (decay * distance >= intensity) {
                    distance = intensity / decay;
                    x += speedX * distance;
                    y += speedY * distance;
                    break;
                }
                intensity -= decay * distance;

                x += speedX * distance;
                y += speedY * distance;

                if (x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) {
                    break;
                }

                times += 1;
            }
            this.lightCtx.lineTo(x, y);
        }
        this.lightCtx.stroke();
    }
}

export { MapRenderer, OffscreenCanvasMapRenderer };