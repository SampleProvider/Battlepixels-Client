import { Pixel, pixels } from "./pixels.js";
import { SimulatedMap } from "./map.js";

class MapRenderer {
    map: SimulatedMap = null;

    setMap(map: SimulatedMap) {
        this.map = map;
        map.renderer = this;
    }
}
class OffscreenCanvasMapRenderer extends MapRenderer {
    canvas: OffscreenCanvas = null;
    ctx: OffscreenCanvasRenderingContext2D = null;

    setMap(map: SimulatedMap) {
        super.setMap(map);
        this.canvas = new OffscreenCanvas(this.map.width, this.map.height);
        this.ctx = this.canvas.getContext("2d");

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
                let id = this.map.grid[(x + y * this.map.width) * this.map.stride + Pixel.Id];
                if (pixels[id].noise != null) {
                    let noise = Math.random() * 2 - 1;
                    this.ctx.fillStyle = "rgba(" + (pixels[id].color[0] + noise * pixels[id].noise[0]) + ", " + (pixels[id].color[1] + noise * pixels[id].noise[1]) + ", " + (pixels[id].color[2] + noise * pixels[id].noise[2]) + ", " + (pixels[id].color[3] + noise * pixels[id].noise[3]) + ")";
                }
                else {
                    this.ctx.fillStyle = "rgba(" + pixels[id].color[0] + ", " + pixels[id].color[1] + ", " + pixels[id].color[2] + ", " + pixels[id].color[3] + ")";
                }
                this.ctx.fillRect(x, y, 1, 1);
        //     }
        // }
    }
    async draw() {
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                this.updatePixel(x, y);
            }
            if (y % 64 == 0) {
                await new Promise((resolve) => {
                    setTimeout(resolve);
                });
            }
        }
    }
}

export { MapRenderer, OffscreenCanvasMapRenderer };