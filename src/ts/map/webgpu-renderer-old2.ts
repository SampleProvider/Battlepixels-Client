
import { pixels } from "./pixels.js";
import { StaticMap } from "./map.js";
import { MapRenderer } from "./renderer.js";
import { cameraScale, cameraX, cameraY } from "../game/camera.js";
import { clientPlayer } from "../entity/client-player.js";
import { Light } from "./light.js";
import { Rig } from "../entity/rig.js";
import { images } from "../game/loader.js";

const adapter = await (navigator as any).gpu?.requestAdapter();
const requiredFeatures = [];
if (adapter.features.has("texture-formats-tier2")) {
    requiredFeatures.push("texture-formats-tier2");
}
const device = await adapter?.requestDevice({
    requiredFeatures: requiredFeatures,
});

const webgpuSupported = device != null;

const format = (navigator as any).gpu?.getPreferredCanvasFormat();
const textureFormat = "rgba32float";
// const format = "rgba8unorm";

class WebgpuMapRenderer extends MapRenderer {
    renderBelowCanvas: HTMLCanvasElement = null;

    belowCanvas: OffscreenCanvas = null;
    belowCtx: OffscreenCanvasRenderingContext2D = null;
    aboveCanvas: OffscreenCanvas = null;
    aboveCtx: OffscreenCanvasRenderingContext2D = null;

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

    canvasTextureDescriptor: GPUTextureDescriptor;

    occlusionCanvasTexture: GPUTexture;
    occlusionCanvasTextureView: GPUTextureView;
    entityOcclusionCanvasTexture: GPUTexture;
    entityOcclusionCanvasTextureView: GPUTextureView;
    lightCanvasTexture: GPUTexture;
    lightCanvasTextureView: GPUTextureView;
    entityLightCanvasTexture: GPUTexture;
    entityLightCanvasTextureView: GPUTextureView;

    belowCanvasTexture: GPUTexture;
    belowCanvasTextureView: GPUTextureView;
    
    webgpuBelowCanvas: HTMLCanvasElement = null;
    webgpuBelowCtx: GPUCanvasContext = null;
    
    webgpuAboveCanvas: HTMLCanvasElement = null;
    webgpuAboveCtx: GPUCanvasContext = null;

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
    
    computeBindGroupLayout = device.createBindGroupLayout({
        label: "Compute Bind Group Layout",
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            storageTexture: {
                access: "read-write",
                format: textureFormat,
                viewDimension: "2d",
            },
        }, {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            storageTexture: {
                access: "read-write",
                format: textureFormat,
                viewDimension: "2d",
            },
        }, {
            binding: 2,
            visibility: GPUShaderStage.COMPUTE,
            storageTexture: {
                access: "read-write",
                format: textureFormat,
                viewDimension: "2d",
            },
        }, {
            binding: 3,
            visibility: GPUShaderStage.COMPUTE,
            storageTexture: {
                access: "read-write",
                format: textureFormat,
                viewDimension: "2d",
            },
        }, {
            binding: 4,
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
                type: "storage",
            },
        }, {
            binding: 5,
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
                type: "uniform",
            },
        }],
    });
    renderBindGroupLayout = device.createBindGroupLayout({
        label: "Render Bind Group Layout",
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            storageTexture: {
                access: "read-only",
                format: textureFormat,
                viewDimension: "2d",
            },
        }, {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            storageTexture: {
                access: "read-only",
                format: textureFormat,
                viewDimension: "2d",
            },
        }, {
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT,
            storageTexture: {
                access: "read-only",
                format: textureFormat,
                viewDimension: "2d",
            },
        }, {
            binding: 3,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: "uniform",
            },
        }, {
            binding: 4,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: "uniform",
            },
        }],
    });
    lightBindGroupLayout = device.createBindGroupLayout({
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
            buffer: {
                type: "read-only-storage",
            },
        }, {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
            buffer: {
                type: "uniform",
            },
        }, {
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
            buffer: {
                type: "uniform",
            },
        }],
    });
    entityLightBindGroupLayout = device.createBindGroupLayout({
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
            buffer: {
                type: "read-only-storage",
            },
        }, {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
            buffer: {
                type: "uniform",
            },
        }, {
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
            buffer: {
                type: "uniform",
            },
        }, {
            binding: 3,
            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
            buffer: {
                type: "uniform",
            },
        }],
    });
    
    computeBindGroup: GPUBindGroup;
    renderBindGroup: GPUBindGroup;
    // lightBindGroup = device.createBindGroup({
    //     layout: this.lightBindGroupLayout,
    //     entries: [{
    //         binding: 0,
    //         resource: {
    //             buffer: this.computeBuffer,
    //         },
    //     }, {
    //         binding: 1,
    //         resource: {
    //             buffer: this.mapSizeBuffer,
    //         },
    //     }, {
    //         binding: 2,
    //         resource: {
    //             buffer: this.lightBuffer,
    //         },
    //     }],
    // });
    // entityLightBindGroup = device.createBindGroup({
    //     layout: this.entityLightBindGroupLayout,
    //     entries: [{
    //         binding: 0,
    //         resource: {
    //             buffer: this.computeBuffer,
    //         },
    //     }, {
    //         binding: 1,
    //         resource: {
    //             buffer: this.mapSizeBuffer,
    //         },
    //     }, {
    //         binding: 2,
    //         resource: {
    //             buffer: this.lightBuffer,
    //         },
    //     }, {
    //         binding: 3,
    //         resource: {
    //             buffer: this.entityBuffer,
    //         },
    //     }],
    // });

    renderPasses: RenderPass[] = [];
    computePasses: ComputePass[] = [];

    constructor(belowCanvas: HTMLCanvasElement) {
        super();
        this.renderBelowCanvas = belowCanvas;
    }

    async init() {
        this.webgpuBelowCanvas = document.getElementById("webgpuBelowCanvas") as HTMLCanvasElement;
        this.webgpuAboveCanvas = document.getElementById("webgpuAboveCanvas") as HTMLCanvasElement;
        window.addEventListener("resize", () => {
            this.resizeCanvas(window.innerWidth * devicePixelRatio, window.innerHeight * devicePixelRatio);
        });
        this.resizeCanvas(window.innerWidth * devicePixelRatio, window.innerHeight * devicePixelRatio);
        this.webgpuBelowCtx = this.webgpuBelowCanvas.getContext("webgpu");
        this.webgpuBelowCtx.configure({
            device: device,
            format: format,
            alphaMode: "premultiplied",
        });
        this.webgpuAboveCtx = this.webgpuAboveCanvas.getContext("webgpu");
        this.webgpuAboveCtx.configure({
            device: device,
            format: format,
            alphaMode: "premultiplied",
        });

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
        for (let i in computePasses) {
            const pass = new ComputePass(this, "compute/" + computePasses[i]);
            await pass.init();
            this.computePasses.push(pass);
        }
    }
    setMap(map: StaticMap) {
        super.setMap(map);

        this.belowCanvas = new OffscreenCanvas(this.map.width * 8, this.map.height * 8);
        this.belowCtx = this.belowCanvas.getContext("2d");
        this.aboveCanvas = new OffscreenCanvas(this.map.width * 8, this.map.height * 8);
        this.aboveCtx = this.aboveCanvas.getContext("2d");
        // this.parallaxCanvas = new OffscreenCanvas(this.map.width * 4, this.map.height * 4);
        this.parallaxCanvas = new OffscreenCanvas(this.map.width * 8, this.map.height * 8);
        this.parallaxCtx = this.parallaxCanvas.getContext("2d");
        this.backgroundCanvas = new OffscreenCanvas(this.map.width * 8, this.map.height * 8);
        this.backgroundCtx = this.backgroundCanvas.getContext("2d");
        this.occlusionCanvas = new OffscreenCanvas(this.map.width * 8, this.map.height * 8);
        this.occlusionCtx = this.occlusionCanvas.getContext("2d");
        this.entityOcclusionCanvas = new OffscreenCanvas(this.map.width * 8, this.map.height * 8);
        this.entityOcclusionCtx = this.entityOcclusionCanvas.getContext("2d");
        this.lightCanvas = new OffscreenCanvas(this.map.width * 8, this.map.height * 8);
        this.lightCtx = this.lightCanvas.getContext("2d");
        this.entityLightCanvas = new OffscreenCanvas(this.map.width * 8, this.map.height * 8);
        this.entityLightCtx = this.entityLightCanvas.getContext("2d");

        this.draw();
        
        this.canvasTextureDescriptor = {
            size: {
                width: this.occlusionCanvas.width,
                height: this.occlusionCanvas.height
            },
            format: "rgba32float",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        };
        this.occlusionCanvasTexture = device.createTexture(this.canvasTextureDescriptor);
        this.entityOcclusionCanvasTexture = device.createTexture(this.canvasTextureDescriptor);
        this.lightCanvasTexture = device.createTexture(this.canvasTextureDescriptor);
        this.entityLightCanvasTexture = device.createTexture(this.canvasTextureDescriptor);
        this.belowCanvasTexture = device.createTexture(this.canvasTextureDescriptor);

        device.queue.copyExternalImageToTexture({ source: this.occlusionCanvas }, { texture: this.occlusionCanvasTexture }, this.canvasTextureDescriptor.size);
        device.queue.copyExternalImageToTexture({ source: this.entityOcclusionCanvas }, { texture: this.entityOcclusionCanvasTexture }, this.canvasTextureDescriptor.size);
        device.queue.copyExternalImageToTexture({ source: this.lightCanvas }, { texture: this.lightCanvasTexture }, this.canvasTextureDescriptor.size);
        device.queue.copyExternalImageToTexture({ source: this.entityLightCanvas }, { texture: this.entityLightCanvasTexture }, this.canvasTextureDescriptor.size);
        
        this.occlusionCanvasTextureView = this.occlusionCanvasTexture.createView({
            format: textureFormat,
        });
        this.entityOcclusionCanvasTextureView = this.entityOcclusionCanvasTexture.createView({
            format: textureFormat,
        });
        this.lightCanvasTextureView = this.lightCanvasTexture.createView({
            format: textureFormat,
        });
        this.entityLightCanvasTextureView = this.entityLightCanvasTexture.createView({
            format: textureFormat,
        });
        this.belowCanvasTextureView = this.belowCanvasTexture.createView({
            format: textureFormat,
        });
        
        this.computeBindGroup = device.createBindGroup({
            layout: this.computeBindGroupLayout,
            entries: [{
                binding: 0,
                resource: this.occlusionCanvasTextureView,
            }, {
                binding: 1,
                resource: this.entityOcclusionCanvasTextureView,
            }, {
                binding: 2,
                resource: this.lightCanvasTextureView,
            }, {
                binding: 3,
                resource: this.entityLightCanvasTextureView,
            }, {
                binding: 4,
                resource: {
                    buffer: this.lightBuffer,
                },
            }, {
                binding: 5,
                resource: {
                    buffer: this.timeBuffer,
                },
            }],
        });
        this.renderBindGroup = device.createBindGroup({
            layout: this.renderBindGroupLayout,
            entries: [{
                binding: 0,
                resource: this.lightCanvasTextureView,
            }, {
                binding: 1,
                resource: this.entityLightCanvasTextureView,
            }, {
                binding: 2,
                resource: this.belowCanvasTextureView,
            }, {
                binding: 3,
                resource: {
                    buffer: this.viewportBuffer,
                },
            }, {
                binding: 4,
                resource: {
                    buffer: this.cameraBuffer,
                },
            }],
        });

        device.pushErrorScope("validation");

        device.popErrorScope().then((error: Error) => {
            if (error) {
                alert("An error occured during initialization." + error.message);
            }
        });
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
                        if (tileset.data.has(id) && tileset.data.get(id).drawAbove) {
                            this.drawTile(this.aboveCtx, i, x, y);
                        }
                        else {
                            this.drawTile(this.belowCtx, i, x, y);
                            this.aboveCtx.globalCompositeOperation = "destination-out";
                            this.drawTile(this.aboveCtx, i, x, y);
                            this.aboveCtx.globalCompositeOperation = "source-over";
                        }
                        if (!tileset.data.has(id) || tileset.data.get(id).occlusion) {
                            this.occlusionCtx.drawImage(images.get(tilesetId), (id % tileset.columns) * 8, Math.floor(id / tileset.columns) * 8, 8, 8, x * 8, y * 8, 8, 8);
                        }
                    }
                }
            }
        }
        this.belowCtx.globalAlpha = 1;
        this.aboveCtx.globalAlpha = 1;
        this.parallaxCtx.globalAlpha = 1;
        this.parallaxCtx.drawImage(images.get("parallax_background"), 0, 0);
        this.lightCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
        this.lightCtx.fillRect(0, 0, this.map.width * 8, this.map.height * 8);
    }
    resizeCanvas(width: number, height: number) {
        this.webgpuBelowCanvas.width = width;
        this.webgpuBelowCanvas.height = height;
        this.webgpuAboveCanvas.width = width;
        this.webgpuAboveCanvas.height = height;
        this.viewport[0] = width;
        this.viewport[1] = height;
        device.queue.writeBuffer(this.viewportBuffer, 0, this.viewport);
    }
    render() {
        const encoder = device.createCommandEncoder();
        // device.queue.copyExternalImageToTexture({ source: this.occlusionCanvas }, { texture: this.occlusionCanvasTexture }, this.canvasTextureDescriptor.size);
        device.queue.copyExternalImageToTexture({ source: this.entityOcclusionCanvas }, { texture: this.entityOcclusionCanvasTexture }, this.canvasTextureDescriptor.size);
        device.queue.copyExternalImageToTexture({ source: this.lightCanvas }, { texture: this.lightCanvasTexture }, this.canvasTextureDescriptor.size);
        device.queue.copyExternalImageToTexture({ source: this.entityLightCanvas }, { texture: this.entityLightCanvasTexture }, this.canvasTextureDescriptor.size);
        device.queue.copyExternalImageToTexture({ source: this.renderBelowCanvas }, { texture: this.belowCanvasTexture }, this.canvasTextureDescriptor.size);

        // device.queue.writeBuffer(this.timeBuffer, 0, new Float32Array([performance.now()]));

        let lights = [];
        for (let [_, light] of Light.list) {
            lights.push(...[light.x + 0.5, light.y + 0.5, light.rotation, light.spread, light.color[0] / 255, light.color[1] / 255, light.color[2] / 255, light.intensity]);
        }

        // this.lightBuffer = device.createBuffer({
        //     size: lights.length * 8 * 4,
        //     usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        // });
        device.queue.writeBuffer(this.lightBuffer, 0, new Float32Array(lights));

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
        
        for (let i in this.computePasses) {
            this.computePasses[i].render(encoder);
        }
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

        if (this.dir == "render/light") {
            this.layout = device.createPipelineLayout({
                bindGroupLayouts: [
                    this.renderer.lightBindGroupLayout,
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
        else if (this.dir == "render/entityLight") {
            this.layout = device.createPipelineLayout({
                bindGroupLayouts: [
                    this.renderer.entityLightBindGroupLayout,
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
        else if (this.dir == "render/main") {
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
        if (this.dir == "render/light") {
            pass = encoder.beginRenderPass({
                label: this.dir,
                colorAttachments: [{
                    view: this.renderer.webgpuBelowCtx.getCurrentTexture().createView(),
                    loadOp: "clear",
                    clearValue: [0, 0, 0, 0],
                    storeOp: "store",
                }],
            });
            pass.setPipeline(this.pipeline);
            pass.setVertexBuffer(0, this.renderer.vertexBuffer);
            pass.setIndexBuffer(this.renderer.indexBuffer, "uint32");
            // pass.setBindGroup(0, this.renderer.lightBindGroup);
            pass.drawIndexed(Light.list.size * this.renderer.indexBuffer.size / 4, 1);

            pass.end();
        }
        else if (this.dir == "render/entityLight") {
            pass = encoder.beginRenderPass({
                label: this.dir,
                colorAttachments: [{
                    view: this.renderer.webgpuAboveCtx.getCurrentTexture().createView(),
                    loadOp: "clear",
                    clearValue: [0, 0, 0, 0],
                    storeOp: "store",
                }],
            });
            pass.setPipeline(this.pipeline);
            pass.setVertexBuffer(0, this.renderer.vertexBuffer);
            pass.setIndexBuffer(this.renderer.indexBuffer, "uint32");
            // pass.setBindGroup(0, this.renderer.entityLightBindGroup);
            pass.drawIndexed(Light.list.size * this.renderer.indexBuffer.size / 4, 1);

            pass.end();
        }
        else if (this.dir == "render/main") {
            pass = encoder.beginRenderPass({
                label: this.dir,
                colorAttachments: [{
                    view: this.renderer.webgpuAboveCtx.getCurrentTexture().createView(),
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
class ComputePass {
    renderer;
    dir;

    shader: string;
    module: GPUShaderModule;
    layout: GPUPipelineLayout;
    pipeline: GPUComputePipeline;

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

        this.layout = device.createPipelineLayout({
            bindGroupLayouts: [
                this.renderer.computeBindGroupLayout,
            ],
        });

        this.pipeline = device.createComputePipeline({
            label: this.dir,
            layout: this.layout,
            compute: {
                module: this.module,
                entryPoint: "compute_main",
            },
        });
    }
    render(encoder: GPUCommandEncoder) {
        if (Light.list.size == 0) {
            return;
        }

        const pass = encoder.beginComputePass({
            label: this.dir,
        });

        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.renderer.computeBindGroup);
        pass.dispatchWorkgroups(Light.list.size);
        pass.end();
    }
}

export { webgpuSupported, WebgpuMapRenderer }