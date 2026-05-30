import { BackgroundEntity } from "./background-entity.js";
import { MapRenderer, OffscreenCanvasMapRenderer } from "./renderer.js";
import { WebgpuMapRenderer } from "./webgpu-renderer.js";

class BackgroundMap extends BackgroundEntity {
    renderer: MapRenderer;

    constructor(renderer: MapRenderer) {
        super(renderer.map.width * 8 / 2, renderer.map.height * 8 / 2, renderer.map.width * 8, renderer.map.height * 8, 1);
        this.renderer = renderer;
    }

    draw(belowCtx: OffscreenCanvasRenderingContext2D) {
        if (this.renderer instanceof WebgpuMapRenderer || this.renderer instanceof OffscreenCanvasMapRenderer) {
            belowCtx.drawImage(this.renderer.parallaxCanvas, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        }
    }
}

export { BackgroundMap };