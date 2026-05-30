import { serverIp } from "../../index.js";
import { Pixel, addUpdatedChunk, pixels } from "./pixels.js";
import { MapRenderer, OffscreenCanvasMapRenderer } from "./renderer.js";

interface GridUpdate {
    x: number,
    y: number,
    id: number,
    speedX: number,
    speedY: number,
}

class SimulatedMap {
    id = 0;
    seed = 0;

    tick = 0;

    width = 0;
    height = 0;

    chunkWidth = 64;
    chunkHeight = 64;

    chunkXAmount = 0;
    chunkYAmount = 0;

    grid: Float32Array;
    nextGrid: Float32Array;
    stride = 4;
    chunks: Int32Array;
    nextChunks: Int32Array;
    chunkStride = 4;

    gridUpdatedChunks: Int32Array;

    updates: GridUpdate[] = [];

    renderer: MapRenderer | null = null;

    static list = new Map<number, SimulatedMap>();

    constructor(id: number, tick: number, width: number, height: number, compressedGrid: Float32Array, chunks: Int32Array) {
        this.id = id;
        this.tick = tick;
        this.width = width;
        this.height = height;

        this.chunkXAmount = Math.ceil(this.width / this.chunkWidth);
        this.chunkYAmount = Math.ceil(this.height / this.chunkHeight);

        let gridArray = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                gridArray.push(...[0, 0, 0, 0]);
            }
        }
        this.grid = new Float32Array(gridArray);
        let nextGridArray = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                nextGridArray.push(...[-1, 0, 0, 0]);
            }
        }
        this.nextGrid = new Float32Array(nextGridArray);
        
        let chunksArray = [];
        for (let y = 0; y < this.chunkYAmount; y++) {
            for (let x = 0; x < this.chunkXAmount; x++) {
                chunksArray.push(...[x * this.chunkWidth, Math.min(x * this.chunkWidth + this.chunkWidth - 1, this.width - 1), y * this.chunkHeight, Math.min(y * this.chunkHeight + this.chunkHeight - 1, this.height - 1)]);
            }
        }
        this.chunks = new Int32Array(chunksArray);
        this.nextChunks = new Int32Array(chunksArray);
        this.gridUpdatedChunks = new Int32Array(chunksArray);

        this.decompressGrid(new Float32Array(compressedGrid));
        this.nextChunks = new Int32Array(chunks);

        SimulatedMap.list.set(this.id, this);
    }

    simulate() {
        let lastChunks = this.chunks;
        this.chunks = this.nextChunks;
        this.nextChunks = lastChunks;
        for (let y = 0; y < this.chunkYAmount; y++) {
            for (let x = 0; x < this.chunkXAmount; x++) {
                this.nextChunks[(x + y * this.chunkXAmount) * this.chunkStride] = x * this.chunkWidth + this.chunkWidth;
                this.nextChunks[(x + y * this.chunkXAmount) * this.chunkStride + 1] = x * this.chunkWidth - 1;
                this.nextChunks[(x + y * this.chunkXAmount) * this.chunkStride + 2] = y * this.chunkHeight + this.chunkHeight;
                this.nextChunks[(x + y * this.chunkXAmount) * this.chunkStride + 3] = y * this.chunkHeight - 1;
            }
        }
        if (this.tick % 2 == 0) {
            for (let chunkY = 0; chunkY < this.chunkYAmount; chunkY++) {
                let updatingChunks = [];
                for (let chunkX = 0; chunkX < this.chunkXAmount; chunkX++) {
                    if (this.chunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride] != chunkX * this.chunkWidth + this.chunkWidth || this.nextChunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride] != chunkX * this.chunkWidth + this.chunkWidth) {
                        updatingChunks.push(chunkX);
                    }
                }
                if (updatingChunks.length == 0) {
                    continue;
                }
                for (let y = chunkY * this.chunkHeight; y < chunkY * this.chunkHeight + this.chunkHeight; y++) {
                    for (let chunkX of updatingChunks) {
                        let minY = Math.min(this.chunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride + 2], this.nextChunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride + 2]);
                        let maxY = Math.max(this.chunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride + 3], this.nextChunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride + 3]);
                        if (y >= minY && y <= maxY) {
                            let minX = Math.min(this.chunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride], this.nextChunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride]);
                            let maxX = Math.max(this.chunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride + 1], this.nextChunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride + 1]);
                            for (let x = minX; x <= maxX; x++) {
                                if (pixels[this.grid[(x + y * this.width) * this.stride + Pixel.Id]].update == null) {
                                    continue;
                                }
                                // randomSeed(x, y);
                                pixels[this.grid[(x + y * this.width) * this.stride + Pixel.Id]].update(this, x, y);
                            }
                        }
                    }
                }
            }
        }
        else {
            for (let chunkY = 0; chunkY < this.chunkYAmount; chunkY++) {
                let updatingChunks = [];
                for (let chunkX = this.chunkXAmount - 1; chunkX >= 0; chunkX--) {
                    if (this.chunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride] != chunkX * this.chunkWidth + this.chunkWidth || this.nextChunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride] != chunkX * this.chunkWidth + this.chunkWidth) {
                        updatingChunks.push(chunkX);
                    }
                }
                if (updatingChunks.length == 0) {
                    continue;
                }
                for (let y = chunkY * this.chunkHeight; y < chunkY * this.chunkHeight + this.chunkHeight; y++) {
                    for (let chunkX of updatingChunks) {
                        let minY = Math.min(this.chunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride + 2], this.nextChunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride + 2]);
                        let maxY = Math.max(this.chunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride + 3], this.nextChunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride + 3]);
                        if (y >= minY && y <= maxY) {
                            let minX = Math.min(this.chunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride], this.nextChunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride]);
                            let maxX = Math.max(this.chunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride + 1], this.nextChunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride + 1]);
                            for (let x = maxX; x >= minX; x--) {
                                if (pixels[this.grid[(x + y * this.width) * this.stride + Pixel.Id]].update == null) {
                                    continue;
                                }
                                // randomSeed(x, y);
                                pixels[this.grid[(x + y * this.width) * this.stride + Pixel.Id]].update(this, x, y);
                            }
                        }
                    }
                }
            }
        }
        for (let chunkY = 0; chunkY < this.chunkYAmount; chunkY++) {
            let updatingChunks = [];
            for (let chunkX = 0; chunkX < this.chunkXAmount; chunkX++) {
                if (this.nextChunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride] != chunkX * this.chunkWidth + this.chunkWidth) {
                    updatingChunks.push(chunkX);
                }
            }
            if (updatingChunks.length == 0) {
                continue;
            }
            for (let y = chunkY * this.chunkHeight; y < chunkY * this.chunkHeight + this.chunkHeight; y++) {
                for (let chunkX of updatingChunks) {
                    let minY = this.nextChunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride + 2];
                    let maxY = this.nextChunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride + 3];
                    if (y >= minY && y <= maxY) {
                        let minX = this.nextChunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride];
                        let maxX = this.nextChunks[(chunkX + chunkY * this.chunkXAmount) * this.chunkStride + 1];
                        for (let x = minX; x <= maxX; x++) {
                            if (this.nextGrid[(x + y * this.width) * this.stride + Pixel.Id] != -1) {
                                this.grid[(x + y * this.width) * this.stride + Pixel.Id] = this.nextGrid[(x + y * this.width) * this.stride + Pixel.Id];
                                this.grid[(x + y * this.width) * this.stride + Pixel.SpeedX] = this.nextGrid[(x + y * this.width) * this.stride + Pixel.SpeedX];
                                this.grid[(x + y * this.width) * this.stride + Pixel.SpeedY] = this.nextGrid[(x + y * this.width) * this.stride + Pixel.SpeedY];
                                this.nextGrid[(x + y * this.width) * this.stride + Pixel.Id] = -1;
                                if (this.renderer instanceof OffscreenCanvasMapRenderer) {
                                    this.renderer.updatePixel(x, y);
                                }
                            }
                        }
                    }
                }
            }
        }
        this.tick += 1;
    }
    static simulateAll() {
        for (let [_, map] of SimulatedMap.list) {
            map.updates = [];
            map.simulate();
        }
    }

    addUpdate(x: number, y: number, id: number, speedX: number, speedY: number) {
        this.grid[(x + y * this.width) * this.stride + Pixel.Id] = id;
        this.grid[(x + y * this.width) * this.stride + Pixel.SpeedX] = speedX;
        this.grid[(x + y * this.width) * this.stride + Pixel.SpeedY] = speedY;
        addUpdatedChunk(this, x, y);
        if (this.renderer instanceof OffscreenCanvasMapRenderer) {
            this.renderer.updatePixel(x, y);
        }
    }
    addUpdates(updates: GridUpdate[]) {
        for (let i in updates) {
            this.addUpdate(updates[i].x, updates[i].y, updates[i].id, updates[i].speedX, updates[i].speedY);
        }
    }

    compressGrid() {
        let compressed = [];
        let id = this.grid[0];
        let speedX = this.grid[1];
        let speedY = this.grid[2];
        let backgroundId = this.grid[3];
        let amount = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (id != this.grid[(x + y * this.width) * this.stride] || speedX != this.grid[(x + y * this.width) * this.stride + 1] || speedY != this.grid[(x + y * this.width) * this.stride + 2] || backgroundId != this.grid[(x + y * this.width) * this.stride + 3]) {
                    compressed.push(...[id, speedX, speedY, backgroundId, amount]);
                    id = this.grid[(x + y * this.width) * this.stride];
                    speedX = this.grid[(x + y * this.width) * this.stride + 1];
                    speedY = this.grid[(x + y * this.width) * this.stride + 2];
                    backgroundId = this.grid[(x + y * this.width) * this.stride + 3];
                    amount = 0;
                }
                amount += 1;
            }
        }
        compressed.push(...[id, speedX, speedY, backgroundId, amount]);
        return compressed;
    }
    decompressGrid(compressed: Float32Array) {
        let index = 0;
        for (let i = 0; i < compressed.length; i += 5) {
            for (let j = 0; j < compressed[i + 4]; j++) {
                this.grid[index * this.stride] = compressed[i];
                this.grid[index * this.stride + 1] = compressed[i + 1];
                this.grid[index * this.stride + 2] = compressed[i + 2];
                this.grid[index * this.stride + 3] = compressed[i + 3];
                index += 1;
            }
        }
    }
}

enum CollisionType {
    Rectangle,
    TriangleTopLeft,
    TriangleTopRight,
    TriangleBottomLeft,
    TriangleBottomRight,
    StairTopLeft,
    StairTopRight,
    StairBottomLeft,
    StairBottomRight,
}

interface Collision {
    type: CollisionType,
    x: number,
    y: number,
    width: number,
    height: number,
    friction: number,
    platform: boolean,
}
interface Teleporter {
    x: number,
    y: number,
    width: number,
    height: number,
    teleportX: number,
    teleportY: number,
    teleportRelativeX: boolean,
    teleportRelativeY: boolean,
    teleportMap: string,
    moveDirection: string,
    direction: string,
}
interface Light {
    x: number,
    y: number,
    rotation: number,
    spread: number,
    color: number[],
    intensity: number,
}
interface CollectiblePerk {
    x: number,
    y: number,
    perkId: string,
    rotation: number,
    speedRotation: number,
    scale: number,
    particles: {
        noiseTime: number,
        magnitude: number,
        rotation: number,
        size: number,
    }[],
}

type RenderableObject = KeybindDisplay;
interface KeybindDisplay {
    type: string,
    x: number,
    y: number,
    keybindId: string,
}

interface MapLayer {
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    visible: boolean,
    opacity: number,
    parallax: boolean,
    parallaxBackground: boolean,
    background: boolean,
    water: boolean,
    data: number[],
}

interface Tileset {
    id: string,
    firstTileId: number,
}

interface TilesetData {
    columns: number,
    data: Map<number, TileData>,
}
interface TileData {
    drawAbove: boolean,
    occlusion: boolean,
    autoTerrain: boolean,
    autoTerrainIndex: number,
    autoTerrainId: string,
    autoTerrainPattern: number,
}

class StaticMap {
    id;

    width = 0;
    height = 0;

    layers: MapLayer[];
    tilesets: Tileset[];
    backgroundColor: number[];

    collisions: Collision[][];
    teleporters: Teleporter[];
    lights: Light[];
    collectiblePerks: CollectiblePerk[];

    renderableObjects: RenderableObject[];

    renderer: MapRenderer | null = null;
    
    static tilesetData: { [key: string]: TilesetData } = {};

    static list = new Map<string, StaticMap>();

    constructor(id: string, width: number, height: number, layers: MapLayer[], tilesets: Tileset[], backgroundColor: number[], collisions: Collision[][], teleporters: Teleporter[], lights: Light[], collectiblePerks: CollectiblePerk[], renderableObjects: RenderableObject[]) {
        this.id = id;
        this.width = width;
        this.height = height;
        
        this.layers = layers;
        this.tilesets = tilesets;
        this.backgroundColor = backgroundColor;

        this.collisions = collisions;
        this.teleporters = teleporters;
        this.lights = lights;
        this.collectiblePerks = collectiblePerks;
        
        this.renderableObjects = renderableObjects;

        StaticMap.list.set(this.id, this);
    }

    static async loadTileset(id: string) {
        let data = await (await fetch(serverIp + "assets/maps/" + id + ".json")).json();

        StaticMap.tilesetData[id] = {
            columns: data.columns,
            data: new Map<number, TileData>(),
        };

        let templates = new Map<string, {
            id: number,
            width: number,
            height: number,
        }>();
        
        for (let i in data.tiles) {
            if (data.tiles[i].properties != null) {
                let tileData: TileData = {
                    drawAbove: false,
                    occlusion: true,
                    autoTerrain: false,
                    autoTerrainIndex: data.tiles[i].id,
                    autoTerrainId: null,
                    autoTerrainPattern: 255,
                };
                for (let j in data.tiles[i].properties) {
                    if (data.tiles[i].properties[j].name == "drawAbove") {
                        tileData.drawAbove = data.tiles[i].properties[j].value;
                    }
                    if (data.tiles[i].properties[j].name == "noOcclusion") {
                        tileData.occlusion = !data.tiles[i].properties[j].value;
                    }
                    if (data.tiles[i].properties[j].name == "autoTerrain") {
                        tileData.autoTerrain = data.tiles[i].properties[j].value;
                    }
                    if (data.tiles[i].properties[j].name == "autoTerrainId") {
                        tileData.autoTerrainId = data.tiles[i].properties[j].value;
                    }
                    if (data.tiles[i].properties[j].name == "autoTerrainPattern") {
                        tileData.autoTerrainPattern = Number(data.tiles[i].properties[j].value);
                    }
                }
                StaticMap.tilesetData[id].data.set(data.tiles[i].id, tileData);
            }
        }
        for (let i in data.tiles) {
            if (data.tiles[i].properties != null) {
                for (let j in data.tiles[i].properties) {
                    if (data.tiles[i].properties[j].name == "templateId") {
                        let templateId = data.tiles[i].properties[j].value;
                        if (!templates.has(templateId)) {
                            let width = 0;
                            let height = 0;
                            for (let k in data.tiles[i].properties) {
                                if (data.tiles[i].properties[k].name == "templateWidth") {
                                    width = data.tiles[i].properties[k].value;
                                }
                                if (data.tiles[i].properties[k].name == "templateHeight") {
                                    height = data.tiles[i].properties[k].value;
                                }
                            }
                            templates.set(templateId, {
                                id: data.tiles[i].id,
                                width: width,
                                height: height,
                            });
                        }
                        let template = templates.get(templateId);
                        let autoTerrainId = null;
                        for (let k in data.tiles[i].properties) {
                            if (data.tiles[i].properties[k].name == "templateAutoTerrainId") {
                                autoTerrainId = data.tiles[i].properties[k].value;
                            }
                        }
                        for (let y = 0; y < template.height; y++) {
                            for (let x = 0; x < template.width; x++) {
                                let tileId = template.id + y * data.imagewidth / data.tilewidth + x;
                                if (StaticMap.tilesetData[id].data.has(tileId)) {
                                    let tileData = structuredClone(StaticMap.tilesetData[id].data.get(tileId));
                                    if (autoTerrainId != null) {
                                        tileData.autoTerrainId = autoTerrainId;
                                        tileData.autoTerrainIndex = data.tiles[i].id;
                                    }
                                    StaticMap.tilesetData[id].data.set(data.tiles[i].id + y * data.imagewidth / data.tilewidth + x, tileData);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

export { SimulatedMap, StaticMap, CollisionType, Collision, Teleporter, Light, CollectiblePerk, RenderableObject, KeybindDisplay };