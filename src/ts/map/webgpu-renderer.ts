
import { pixels } from "./pixels.js";
import { StaticMap } from "./map.js";
import { MapRenderer } from "./renderer.js";
import { cameraScale, cameraX, cameraY } from "../game/camera.js";
import { clientPlayer } from "../entity/client-player.js";
import { Rig } from "../entity/rig.js";
import { images } from "../game/loader.js";

const adapter = await (navigator as any).gpu?.requestAdapter();
const device = await adapter?.requestDevice();

const webgpuSupported = new URLSearchParams(window.location.search).get("noWebgpu") && device != null;

const format = (navigator as any).gpu?.getPreferredCanvasFormat();
const textureFormat = "rgba8unorm";
// const format = "rgba8unorm";

class WebgpuMapRenderer extends MapRenderer {
    canvas: HTMLCanvasElement = null;
    ctx: GPUCanvasContext = null;

    belowCanvas: OffscreenCanvas = null;
    belowCtx: OffscreenCanvasRenderingContext2D = null;
    aboveCanvas: OffscreenCanvas = null;
    aboveCtx: OffscreenCanvasRenderingContext2D = null;
    
    waterCanvas: OffscreenCanvas = null;
    waterCtx: OffscreenCanvasRenderingContext2D = null;

    parallaxCanvas: OffscreenCanvas = null;
    parallaxCtx: OffscreenCanvasRenderingContext2D = null;

    backgroundCanvas: OffscreenCanvas = null;
    backgroundCtx: OffscreenCanvasRenderingContext2D = null;
    
    canvasTextureDescriptor: GPUTextureDescriptor;

    belowCanvasTexture: GPUTexture;
    belowCanvasTextureView: GPUTextureView;
    aboveCanvasTexture: GPUTexture;
    aboveCanvasTextureView: GPUTextureView;

    waterCanvasTexture: GPUTexture;
    waterCanvasTextureView: GPUTextureView;

    offscreenCanvasTextureDescriptor: GPUTextureDescriptor;
    backgroundOffscreenCanvasTexture: GPUTexture;
    backgroundOffscreenCanvasTextureView: GPUTextureView;
    belowOffscreenCanvasTexture: GPUTexture;
    belowOffscreenCanvasTextureView: GPUTextureView;

    vertexBuffer = device.createBuffer({
        size: 8 * 4,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    indexBuffer = device.createBuffer({
        size: 6 * 4,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    timeBuffer = device.createBuffer({
        size: 1 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    
    lightBuffer = device.createBuffer({
        size: 64 * 8 * 4,
        // x, y, rotation, spread, r, g, b, intensity
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    entityBuffer = device.createBuffer({
        size: 64 * 4 * 4,
        // x, y, width, height
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    computeBuffer = device.createBuffer({
        size: 16 * 16 * 2 * 4,
        // distance, length
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    viewport = new Float32Array([window.innerWidth * devicePixelRatio, window.innerHeight * devicePixelRatio]);
    viewportBuffer = device.createBuffer({
        size: 2 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    cameraBuffer = device.createBuffer({
        size: 4 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    
    renderBindGroupLayout = device.createBindGroupLayout({
        label: "Render Bind Group Layout",
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {
                sampleType: "float",
                viewDimension: "2d",
            },
        }, {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {
                sampleType: "float",
                viewDimension: "2d",
            },
            // storageTexture: {
            //     access: "read-only",
            //     format: textureFormat,
            //     viewDimension: "2d",
            // },
        }, {
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {
                sampleType: "float",
                viewDimension: "2d",
            },
        }, {
            binding: 3,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {
                sampleType: "float",
                viewDimension: "2d",
            },
        }, {
            binding: 4,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {
                sampleType: "float",
                viewDimension: "2d",
            },
        }, {
            binding: 5,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: "uniform",
            },
        }, {
            binding: 6,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: "uniform",
            },
        }, {
            binding: 7,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: "uniform",
            },
        }],
    });
    
    computeBindGroup: GPUBindGroup;
    renderBindGroup: GPUBindGroup;

    renderPasses: RenderPass[] = [];

    async init() {
        this.canvas = document.getElementById("webgpuCanvas") as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("webgpu");
        this.ctx.configure({
            device: device,
            format: format,
            alphaMode: "premultiplied",
        });
        // this.webgpuBelowCanvas = document.getElementById("webgpuBelowCanvas") as HTMLCanvasElement;
        // this.webgpuAboveCanvas = document.getElementById("webgpuAboveCanvas") as HTMLCanvasElement;
        // this.webgpuBelowCtx = this.webgpuBelowCanvas.getContext("webgpu");
        // this.webgpuBelowCtx.configure({
        //     device: device,
        //     format: format,
        //     alphaMode: "premultiplied",
        // });
        // this.webgpuAboveCtx = this.webgpuAboveCanvas.getContext("webgpu");
        // this.webgpuAboveCtx.configure({
        //     device: device,
        //     format: format,
        //     alphaMode: "premultiplied",
        // });

        device.queue.writeBuffer(this.vertexBuffer, 0, new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1,
        ]));
        device.queue.writeBuffer(this.indexBuffer, 0, new Uint32Array([
            0, 1, 2,
            1, 2, 3,
        ]));
        
        let renderPasses = ["main"];
        let computePasses = ["main"];
        for (let i in renderPasses) {
            const pass = new RenderPass(this, "render/" + renderPasses[i]);
            // const pass = new RenderPass(renderPasses[i]);
            await pass.init();
            this.renderPasses.push(pass);
        }
        // for (let i in computePasses) {
        //     const pass = new ComputePass(this, "compute/" + computePasses[i]);
        //     await pass.init();
        //     this.computePasses.push(pass);
        // }
    }
    setMap(map: StaticMap) {
        super.setMap(map);

        this.belowCanvas = new OffscreenCanvas(this.map.width * 8, this.map.height * 8);
        this.belowCtx = this.belowCanvas.getContext("2d");
        this.aboveCanvas = new OffscreenCanvas(this.map.width * 8, this.map.height * 8);
        this.aboveCtx = this.aboveCanvas.getContext("2d");
        this.waterCanvas = new OffscreenCanvas(this.map.width * 8, this.map.height * 8);
        this.waterCtx = this.waterCanvas.getContext("2d");
        this.parallaxCanvas = new OffscreenCanvas(this.map.width * 8, this.map.height * 8);
        this.parallaxCtx = this.parallaxCanvas.getContext("2d");
        this.backgroundCanvas = new OffscreenCanvas(this.map.width * 8, this.map.height * 8);
        this.backgroundCtx = this.backgroundCanvas.getContext("2d");

        this.draw();
        
        this.canvasTextureDescriptor = {
            size: {
                width: this.map.width * 8,
                height: this.map.height * 8,
            },
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        };
        
        this.belowCanvasTexture = device.createTexture(this.canvasTextureDescriptor);
        device.queue.copyExternalImageToTexture({ source: this.belowCanvas }, { texture: this.belowCanvasTexture }, this.canvasTextureDescriptor.size);
        
        this.belowCanvasTextureView = this.belowCanvasTexture.createView({
            format: textureFormat,
        });
        
        this.aboveCanvasTexture = device.createTexture(this.canvasTextureDescriptor);
        device.queue.copyExternalImageToTexture({ source: this.aboveCanvas }, { texture: this.aboveCanvasTexture }, this.canvasTextureDescriptor.size);
        
        this.aboveCanvasTextureView = this.aboveCanvasTexture.createView({
            format: textureFormat,
        });

        this.waterCanvasTexture = device.createTexture(this.canvasTextureDescriptor);
        device.queue.copyExternalImageToTexture({ source: this.waterCanvas }, { texture: this.waterCanvasTexture }, this.canvasTextureDescriptor.size);
        
        this.waterCanvasTextureView = this.waterCanvasTexture.createView({
            format: textureFormat,
        });

        // this.belowOffscreenCanvasTextureDescriptor = {
        //     size: {
        //         width: this.canvas.width,
        //         height: this.canvas.height,
        //     },
        //     format: "rgba8unorm",
        //     usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        // };
        // this.belowOffscreenCanvasTexture = device.createTexture(this.belowOffscreenCanvasTextureDescriptor);
        // this.belowOffscreenCanvasTextureView = this.belowOffscreenCanvasTexture.createView({
        //     format: textureFormat,
        // });
        
        // this.computeBindGroup = device.createBindGroup({
        //     layout: this.computeBindGroupLayout,
        //     entries: [{
        //         binding: 0,
        //         resource: this.occlusionCanvasTextureView,
        //     }, {
        //         binding: 1,
        //         resource: this.entityOcclusionCanvasTextureView,
        //     }, {
        //         binding: 2,
        //         resource: this.lightCanvasTextureView,
        //     }, {
        //         binding: 3,
        //         resource: this.entityLightCanvasTextureView,
        //     }, {
        //         binding: 4,
        //         resource: {
        //             buffer: this.lightBuffer,
        //         },
        //     }, {
        //         binding: 5,
        //         resource: {
        //             buffer: this.timeBuffer,
        //         },
        //     }],
        // });
        // this.renderBindGroup = device.createBindGroup({
        //     layout: this.renderBindGroupLayout,
        //     entries: [{
        //         binding: 0,
        //         resource: this.waterCanvasTextureView,
        //     }, {
        //         binding: 1,
        //         resource: this.belowOffscreenCanvasTextureView,
        //     }, {
        //         binding: 2,
        //         resource: {
        //             buffer: this.viewportBuffer,
        //         },
        //     }, {
        //         binding: 3,
        //         resource: {
        //             buffer: this.cameraBuffer,
        //         },
        //     }, {
        //         binding: 4,
        //         resource: {
        //             buffer: this.timeBuffer,
        //         },
        //     }],
        // });

        device.pushErrorScope("validation");

        device.popErrorScope().then((error: Error) => {
            if (error) {
                alert("An error occured during initialization." + error.message);
            }
        });
        window.addEventListener("resize", () => {
            this.resizeCanvas(window.innerWidth * devicePixelRatio, window.innerHeight * devicePixelRatio);
        });
        this.resizeCanvas(window.innerWidth * devicePixelRatio, window.innerHeight * devicePixelRatio);
    }
    
    draw() {
        let gradient = this.backgroundCtx.createLinearGradient(0, 0, 0, this.map.height * 8);
        gradient.addColorStop(0, "rgb(225, 240, 255)");
        gradient.addColorStop(1, "rgb(180, 180, 255)");
        // gradient.addColorStop(0, "rgb(25, 40, 55)");
        // gradient.addColorStop(1, "rgb(0, 0, 0)");
        this.backgroundCtx.fillStyle = gradient;
        this.backgroundCtx.fillRect(0, 0, this.map.width * 8, this.map.height * 8);
        // belowCtx.fillStyle = "#000000";
        // belowCtx.fillRect(0, 0, mapRenderer.map.width * 8, mapRenderer.map.height * 8);
        for (let i = 0; i < this.map.layers.length; i++) {
            if (!this.map.layers[i].visible) {
                continue;
            }
            if (this.map.layers[i].parallax) {
                this.parallaxCtx.globalAlpha = this.map.layers[i].opacity;
            }
            else {
                this.belowCtx.globalAlpha = this.map.layers[i].opacity;
                this.aboveCtx.globalAlpha = this.map.layers[i].opacity;
                this.waterCtx.globalAlpha = this.map.layers[i].opacity;
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
                        let [id, tilesetId] = this.getTileId(this.map.layers[i].data[x + y * this.map.width] - 1) as [number, string];
                        let tileset = StaticMap.tilesetData[tilesetId];
                        if (this.map.layers[i].water) {
                            this.drawTile(this.waterCtx, i, x, y);
                        }
                        else if (this.map.layers[i].background) {
                            this.drawTile(this.belowCtx, i, x, y);
                        }
                        else {
                            this.drawTile(this.aboveCtx, i, x, y);
                        }
                        // if (tileset.data.has(id) && tileset.data.get(id).drawAbove) {
                        //     // this.drawTile(this.aboveCtx, i, x, y);
                        //     // this.drawTile(this.belowCtx, i, x, y);
                        //     this.drawTile(this.waterCtx, i, x, y);
                        // }
                        // else {
                        //     if (i == 0) {

                        //     }
                        //     else {
                        //     }
                        //     // this.drawTile(this.belowCtx, i, x, y);
                        //     // this.aboveCtx.globalCompositeOperation = "destination-out";
                        //     // this.waterCtx.globalCompositeOperation = "destination-out";
                        //     // this.drawTile(this.aboveCtx, i, x, y);
                        //     // this.drawTile(this.waterCtx, i, x, y);
                        //     // this.aboveCtx.globalCompositeOperation = "source-over";
                        //     // this.waterCtx.globalCompositeOperation = "source-over";
                        // }
                        // // if (!tileset.data.has(id) || tileset.data.get(id).occlusion) {
                        // //     this.occlusionCtx.drawImage(images.get(tilesetId), (id % tileset.columns) * 8, Math.floor(id / tileset.columns) * 8, 8, 8, x * 8, y * 8, 8, 8);
                        // // }
                    }
                }
            }
        }
        this.belowCtx.globalAlpha = 1;
        this.aboveCtx.globalAlpha = 1;
        this.waterCtx.globalAlpha = 1;
        this.parallaxCtx.globalAlpha = 1;
        this.parallaxCtx.drawImage(images.get("parallax_background"), this.map.width * 4 - images.get("parallax_background").width / 2, this.map.height * 4 - images.get("parallax_background").height / 2);
        // this.lightCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
        // this.lightCtx.fillRect(0, 0, this.map.width * 8, this.map.height * 8);
    }
    resizeCanvas(width: number, height: number) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.viewport[0] = width;
        this.viewport[1] = height;
        device.queue.writeBuffer(this.viewportBuffer, 0, this.viewport);
        this.offscreenCanvasTextureDescriptor = {
            size: {
                width: width,
                height: height,
            },
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        };
        this.backgroundOffscreenCanvasTexture = device.createTexture(this.offscreenCanvasTextureDescriptor);
        
        this.backgroundOffscreenCanvasTextureView = this.backgroundOffscreenCanvasTexture.createView({
            format: textureFormat,
        });
        this.belowOffscreenCanvasTexture = device.createTexture(this.offscreenCanvasTextureDescriptor);
        
        this.belowOffscreenCanvasTextureView = this.belowOffscreenCanvasTexture.createView({
            format: textureFormat,
        });
        this.renderBindGroup = device.createBindGroup({
            layout: this.renderBindGroupLayout,
            entries: [{
                binding: 0,
                resource: this.belowCanvasTextureView,
            }, {
                binding: 1,
                resource: this.aboveCanvasTextureView,
            }, {
                binding: 2,
                resource: this.waterCanvasTextureView,
            }, {
                binding: 3,
                resource: this.backgroundOffscreenCanvasTextureView,
            }, {
                binding: 4,
                resource: this.belowOffscreenCanvasTextureView,
            }, {
                binding: 5,
                resource: {
                    buffer: this.viewportBuffer,
                },
            }, {
                binding: 6,
                resource: {
                    buffer: this.cameraBuffer,
                },
            }, {
                binding: 7,
                resource: {
                    buffer: this.timeBuffer,
                },
            }],
        });
    }
    render(backgroundOffscreenCanvas: OffscreenCanvas, belowOffscreenCanvas: OffscreenCanvas) {
        const encoder = device.createCommandEncoder();
        // device.queue.copyExternalImageToTexture({ source: this.waterCanvas }, { texture: this.waterCanvasTexture }, this.canvasTextureDescriptor.size);
        device.queue.copyExternalImageToTexture({ source: backgroundOffscreenCanvas }, { texture: this.backgroundOffscreenCanvasTexture }, this.offscreenCanvasTextureDescriptor.size);
        device.queue.copyExternalImageToTexture({ source: belowOffscreenCanvas }, { texture: this.belowOffscreenCanvasTexture }, this.offscreenCanvasTextureDescriptor.size);

        device.queue.writeBuffer(this.timeBuffer, 0, new Float32Array([performance.now()]));

        // let lights = [];
        // for (let [_, light] of Light.list) {
        //     lights.push(...[light.x + 0.5, light.y + 0.5, light.rotation, light.spread, light.color[0] / 255, light.color[1] / 255, light.color[2] / 255, light.intensity]);
        // }

        // this.lightBuffer = device.createBuffer({
        //     size: lights.length * 8 * 4,
        //     usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        // });
        // device.queue.writeBuffer(this.lightBuffer, 0, new Float32Array(lights));

        // this.computeBuffer = device.createBuffer({
        //     size: lights.length * 100 * 2 * 4,
        //     usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        // });

        let entities = [];
        for (let [_, rig] of Rig.list) {
            entities.push(...[rig.x, rig.y, rig.width, rig.height]);
        }

        this.entityBuffer = device.createBuffer({
            size: entities.length * 4 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.entityBuffer, 0, new Float32Array(entities));

        device.queue.writeBuffer(this.cameraBuffer, 0, new Float32Array([cameraX, cameraY, cameraScale, cameraScale]));
        
        for (let i in this.renderPasses) {
            this.renderPasses[i].render(encoder);
        }

        device.queue.submit([encoder.finish()]);
    }
}

class RenderPass {
    renderer;
    dir;

    shader: string;
    module: GPUShaderModule;
    layout: GPUPipelineLayout;
    pipeline: GPURenderPipeline;
    
    constructor(renderer: WebgpuMapRenderer, dir: string) {
        this.renderer = renderer;
        this.dir = dir;
    }
    async init() {
        this.shader = await (await fetch("./src/passes/" + this.dir + ".wgsl")).text();
        
        if (this.shader == null) {
            throw new Error("no shader found buh");
        }

        this.module = device.createShaderModule({
            label: this.dir,
            code: this.shader,
        });

        if (this.dir == "render/main") {
            this.layout = device.createPipelineLayout({
                bindGroupLayouts: [
                    this.renderer.renderBindGroupLayout,
                ],
            });
            
            this.pipeline = device.createRenderPipeline({
                label: this.dir,
                layout: this.layout,
                vertex: {
                    module: this.module,
                    entryPoint: "vs_main",
                    buffers: [{
                        // vertex x y
                        // instance x y size color
                        attributes: [{
                            shaderLocation: 0, // @location(0)
                            offset: 0,
                            format: "float32x2",
                        }],
                        arrayStride: 4 * 2, // sizeof(float) * 3
                        stepMode: "vertex",
                    }],
                },
                fragment: {
                    module: this.module,
                    entryPoint: "fs_main",
                    targets: [{
                        format: format,
                        blend: {
                            color: {
                                operation: "add",
                                srcFactor: "src-alpha",
                                dstFactor: "one-minus-src-alpha",
                            },
                            alpha: {
                                operation: "add",
                                srcFactor: "one",
                                dstFactor: "one",
                            },
                        },
                    }],
                },
                primitive: {
                    topology: "triangle-list",
                },
            });
        }
    }
    render(encoder: GPUCommandEncoder) {
        if (this.pipeline == null) {
            return;
        }
        let pass;
        if (this.dir == "render/main") {
            pass = encoder.beginRenderPass({
                label: this.dir,
                colorAttachments: [{
                    view: this.renderer.ctx.getCurrentTexture().createView(),
                    loadOp: "clear",
                    clearValue: [0, 0, 0, 0],
                    storeOp: "store",
                }],
            });
            pass.setPipeline(this.pipeline);
            pass.setVertexBuffer(0, this.renderer.vertexBuffer);
            pass.setIndexBuffer(this.renderer.indexBuffer, "uint32");
            pass.setBindGroup(0, this.renderer.renderBindGroup);
            pass.drawIndexed(this.renderer.indexBuffer.size / 4, 1);

            pass.end();
        }
    }
}

export { webgpuSupported, WebgpuMapRenderer }