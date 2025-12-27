import { Pixel, addUpdatedChunk, pixels } from "./pixels.js";
import { MapRenderer, OffscreenCanvasMapRenderer } from "./renderer.js";
import { WebgpuMapRenderer } from "./webgpu-renderer.js";

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
        let amount = 1;
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

export { SimulatedMap };