
import { pixels } from "./pixels.js";
import { SimulatedMap } from "./map.js";
import { MapRenderer } from "./renderer.js";
import { cameraScale, cameraX, cameraY } from "../game/camera.js";

const adapter = await (navigator as any).gpu?.requestAdapter();
const device = await adapter?.requestDevice();

const webgpuSupported = device != null;

const format = (navigator as any).gpu?.getPreferredCanvasFormat();

class WebgpuMapRenderer extends MapRenderer {
    canvas: HTMLCanvasElement = null;
    ctx: GPUCanvasContext = null;

    vertexBuffer = device.createBuffer({
        size: 4 * 8,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    indexBuffer = device.createBuffer({
        size: 4 * 6,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });


    viewport = new Float32Array([window.innerWidth * devicePixelRatio, window.innerHeight * devicePixelRatio]);
    viewportBuffer = device.createBuffer({
        size: 4 * 2,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    cameraBuffer = device.createBuffer({
        size: 4 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    timeBuffer = device.createBuffer({
        size: 4 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    
    cameraBindGroupLayout = device.createBindGroupLayout({
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
            buffer: {
                type: "uniform",
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
    cameraBindGroup = device.createBindGroup({
        layout: this.cameraBindGroupLayout,
        entries: [{
            binding: 0,
            resource: {
                buffer: this.viewportBuffer,
            },
        }, {
            binding: 1,
            resource: {
                buffer: this.cameraBuffer,
            },
        }, {
            binding: 2,
            resource: {
                buffer: this.timeBuffer,
            },
        }],
    });

    gridSizeBuffer = device.createBuffer({
        size: 4 * 2,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    chunkSizeBuffer = device.createBuffer({
        size: 4 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    gridBuffer = device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    chunksBuffer = device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    colorsBuffer = device.createBuffer({
        size: 8 * 4 * pixels.length,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    renderBindGroupLayout = device.createBindGroupLayout({
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: "uniform",
            },
        }, {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: "uniform",
            },
        }, {
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: "read-only-storage",
            },
        }, {
            binding: 3,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: "read-only-storage",
            },
        }, {
            binding: 4,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: "read-only-storage",
            },
        }],
    });
    renderBindGroup: GPUBindGroup;

    renderPasses: RenderPass[] = [];

    async init() {
        this.canvas = document.getElementById("webgpuCanvas") as HTMLCanvasElement;
        window.addEventListener("resize", () => {
            this.resizeCanvas(window.innerWidth * devicePixelRatio, window.innerHeight * devicePixelRatio);
        });
        this.resizeCanvas(window.innerWidth * devicePixelRatio, window.innerHeight * devicePixelRatio);
        this.ctx = this.canvas.getContext("webgpu");
        this.ctx.configure({
            device: device,
            format: format,
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
        device.queue.writeBuffer(this.viewportBuffer, 0, this.viewport);

        let pixelColors = [];
        for (let i in pixels) {
            if (pixels[i].color != null) {
                pixelColors.push(...[pixels[i].color[0] / 255, pixels[i].color[1] / 255, pixels[i].color[2] / 255, pixels[i].color[3]]);
                if (pixels[i].noise != null) {
                    pixelColors.push(...[pixels[i].noise[0] / 255, pixels[i].noise[1] / 255, pixels[i].noise[2] / 255, pixels[i].noise[3]]);
                }
                else {
                    pixelColors.push(...[0, 0, 0, 0]);
                }
            }
            else {
                pixelColors.push(...[0, 0, 0, 0, 0, 0, 0, 0]);
            }
        }
        device.queue.writeBuffer(this.colorsBuffer, 0, new Float32Array(pixelColors));
        
        let renderPasses = ["main"];
        for (let i in renderPasses) {
            const pass = new RenderPass(this, "render/" + renderPasses[i]);
            // const pass = new RenderPass(renderPasses[i]);
            await pass.init();
            this.renderPasses.push(pass);
        }
        // for (let i in computePasses) {
        //     const pass = new ComputePass("compute/" + computePasses[i]);
        //     pass.init();
        //     computePasses[i] = pass;
        // }
    }
    setMap(map: SimulatedMap) {
        super.setMap(map);

        // this.canvas = new OffscreenCanvas(this.map.width, this.map.height);
        // this.canvas = document.createElement("canvas");
        // this.canvas.width = this.map.width;
        // this.canvas.height = this.map.height;
        // this.canvas.width = window.innerWidth * devicePixelRatio;
        // this.canvas.height = window.innerHeight * devicePixelRatio;
        // window.addEventListener("resize", () => {
        //     this.resizeCanvas(window.innerWidth * devicePixelRatio, window.innerHeight * devicePixelRatio);
        // });
        // this.resizeCanvas(window.innerWidth * devicePixelRatio, window.innerHeight * devicePixelRatio);
        // this.ctx = this.canvas.getContext("webgpu");
        // this.ctx.configure({
        //     device: device,
        //     format: format,
        // });

        device.pushErrorScope("validation");

        this.resizeGrid();

        device.popErrorScope().then((error: Error) => {
            if (error) {
                alert("An error occured during initialization." + error.message);
            }
        });
    }
    createBindGroups() {
        this.renderBindGroup = device.createBindGroup({
            layout: this.renderBindGroupLayout,
            entries: [{
                binding: 0,
                resource: {
                    buffer: this.gridSizeBuffer,
                },
            }, {
                binding: 1,
                resource: {
                    buffer: this.chunkSizeBuffer,
                },
            }, {
                binding: 2,
                resource: {
                    buffer: this.gridBuffer,
                },
            }, {
                binding: 3,
                resource: {
                    buffer: this.chunksBuffer,
                },
            }, {
                binding: 4,
                resource: {
                    buffer: this.colorsBuffer,
                },
            }],
        });
    }
    
    resizeCanvas(width: number, height: number) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.viewport[0] = width;
        this.viewport[1] = height;
        device.queue.writeBuffer(this.viewportBuffer, 0, this.viewport);
        // motionBlurTexture = device.createTexture({
        //     label: "Motion Blur Texture",
        //     size: [width, height],
        //     // format: "r8unorm",
        //     format: format,
        //     usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        // });
        // motionBlurTextureView = motionBlurTexture.createView({
        //     // format: "r8unorm",
        //     format: format,
        // });
        // motionBlurTextureBindGroup = device.createBindGroup({
        //     layout: motionBlurTextureBindGroupLayout,
        //     entries: [{
        //         binding: 0,
        //         resource: motionBlurTextureView,
        //     }, {
        //         binding: 1,
        //         resource: motionBlurTextureSampler,
        //     }, {
        //         binding: 2,
        //         resource: {
        //             buffer: gridSizeBuffer,
        //         },
        //     }],
        // });
    }
    resizeGrid() {
        this.gridBuffer = device.createBuffer({
            size: 4 * 4 * this.map.width * this.map.height,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.chunksBuffer = device.createBuffer({
            size: 4 * 4 * this.map.chunkXAmount * this.map.chunkYAmount,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.gridSizeBuffer, 0, new Uint32Array([this.map.width, this.map.height]));
        device.queue.writeBuffer(this.chunkSizeBuffer, 0, new Uint32Array([this.map.chunkWidth, this.map.chunkHeight, this.map.chunkXAmount, this.map.chunkYAmount]));
        this.createBindGroups();
    }
    render() {
        const encoder = device.createCommandEncoder();

        device.queue.writeBuffer(this.cameraBuffer, 0, new Float32Array([cameraX, cameraY, cameraScale, cameraScale]));
        device.queue.writeBuffer(this.timeBuffer, 0, new Float32Array([performance.now()]));

        // if (this.map.gridUpdated) {
            for (let chunkY = 0; chunkY < this.map.chunkYAmount; chunkY++) {
                for (let chunkX = 0; chunkX < this.map.chunkXAmount; chunkX++) {
                    let minX = this.map.gridUpdatedChunks[(chunkX + chunkY * this.map.chunkXAmount) * this.map.chunkStride];
                    let maxX = this.map.gridUpdatedChunks[(chunkX + chunkY * this.map.chunkXAmount) * this.map.chunkStride + 1];
                    if (maxX >= minX) {
                        let minY = this.map.gridUpdatedChunks[(chunkX + chunkY * this.map.chunkXAmount) * this.map.chunkStride + 2];
                        let maxY = this.map.gridUpdatedChunks[(chunkX + chunkY * this.map.chunkXAmount) * this.map.chunkStride + 3];
                        for (let y = minY; y <= maxY; y++) {
                            let index = (minX + y * this.map.width) * this.map.stride;
                            device.queue.writeBuffer(this.gridBuffer, index * 4, this.map.grid, index, (maxX - minX + 1) * this.map.stride);
                        }
                    }
                }
            }
            for (let y = 0; y < this.map.chunkYAmount; y++) {
                for (let x = 0; x < this.map.chunkXAmount; x++) {
                    let index = (x + y * this.map.chunkXAmount) * this.map.chunkStride;
                    this.map.gridUpdatedChunks[index] = x * this.map.chunkWidth + this.map.chunkWidth;
                    this.map.gridUpdatedChunks[index + 1] = x * this.map.chunkWidth - 1;
                    this.map.gridUpdatedChunks[index + 2] = y * this.map.chunkHeight + this.map.chunkHeight;
                    this.map.gridUpdatedChunks[index + 3] = y * this.map.chunkHeight - 1;
                }
            }
            // this.map.gridUpdated = false;
            // device.queue.writeBuffer(this.gridBuffer, 0, this.map.grid);
            device.queue.writeBuffer(this.chunksBuffer, 0, this.map.chunks);
        // }
        // device.queue.writeBuffer(this.chunksBuffer, 0, this.map.chunks);

        for (let i in this.renderPasses) {
            this.renderPasses[i].render(encoder);
        }

        device.queue.submit([encoder.finish()]);
    }
}


// let motionBlurTexture;
// let motionBlurTextureView;
// let motionBlurTextureSampler = device.createSampler();
// let motionBlurTextureBindGroupLayout = device.createBindGroupLayout({
//     entries: [{
//         binding: 0,
//         visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
//         texture: {
//             sampleType: "float",
//             viewDimension: "2d",
//             multisampled: false,
//         },
//     }, {
//         binding: 1,
//         visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
//         sampler: {
//             type: "non-filtering",
//         },
//     }, {
//         binding: 2,
//         visibility: GPUShaderStage.FRAGMENT,
//         buffer: {
//             type: "uniform",
//         },
//     }],
// });
// let motionBlurTextureBindGroup;

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
        this.shader = await(await fetch("./src/passes/" + this.dir + ".wgsl")).text();
        
        if (this.shader == null) {
            throw new Error("no shader found buh");
        }

        let pixelIds = [];
        for (let i in pixels) {
            pixelIds.push({
                name: pixels[i].id.toUpperCase(),
                id: i,
            });
        }
        pixelIds.sort((a, b) => {
            return b.name.length - a.name.length;
        });
        for (let i in pixelIds) {
            this.shader = this.shader.replaceAll(pixelIds[i].name, pixelIds[i].id);
        }

        this.module = device.createShaderModule({
            label: this.dir,
            code: this.shader,
        });

        if (this.dir == "render/useless" || this.dir == "render/useless2") {
            // this.layout = device.createPipelineLayout({
            //     bindGroupLayouts: [
            //         cameraBindGroupLayout,
            //         motionBlurTextureBindGroupLayout,
            //     ],
            // });
    
            // this.pipeline = device.createRenderPipeline({
            //     label: this.dir,
            //     layout: this.layout,
            //     vertex: {
            //         module: this.module,
            //         entryPoint: "vs_main",
            //         buffers: [{
            //             // vertex x y
            //             // instance x y size color
            //             attributes: [{
            //                 shaderLocation: 0, // @location(0)
            //                 offset: 0,
            //                 format: "float32x2",
            //             }],
            //             arrayStride: 4 * 2, // sizeof(float) * 3
            //             stepMode: "vertex",
            //         }],
            //     },
            //     fragment: {
            //         module: this.module,
            //         entryPoint: "fs_main",
            //         // targets: [{
            //         //     format: format,
            //         //     blend: {
            //         //         color: {
            //         //             operation: "add",
            //         //             srcFactor: "src-alpha",
            //         //             dstFactor: "dst-alpha",
            //         //         },
            //         //         alpha: {
            //         //             operation: "add",
            //         //             srcFactor: "one",
            //         //             dstFactor: "one",
            //         //         },
            //         //     },
            //         // }, {
            //         //     format: "r8unorm",
            //         //     blend: {
            //         //         color: {
            //         //             operation: "add",
            //         //             srcFactor: "src-alpha",
            //         //             dstFactor: "dst-alpha",
            //         //         },
            //         //         alpha: {
            //         //             operation: "add",
            //         //             srcFactor: "one",
            //         //             dstFactor: "one",
            //         //         },
            //         //     },
            //         //     // writeMask: 0,
            //         // }],
            //         targets: [{
            //             // format: "r8unorm",
            //             format: format,
            //             // blend: {
            //             //     color: {
            //             //         operation: "add",
            //             //         srcFactor: "src-alpha",
            //             //         dstFactor: "dst-alpha",
            //             //     },
            //             //     alpha: {
            //             //         operation: "add",
            //             //         srcFactor: "one",
            //             //         dstFactor: "one",
            //             //     },
            //             // },
            //             // writeMask: 0,
            //         }],
            //     },
            //     primitive: {
            //         topology: "triangle-list",
            //     },
            // });
        }
        else {
            this.layout = device.createPipelineLayout({
                bindGroupLayouts: [
                    this.renderer.cameraBindGroupLayout,
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
                    // targets: [{
                    //     format: format,
                    //     blend: {
                    //         color: {
                    //             operation: "add",
                    //             srcFactor: "src-alpha",
                    //             dstFactor: "dst-alpha",
                    //         },
                    //         alpha: {
                    //             operation: "add",
                    //             srcFactor: "one",
                    //             dstFactor: "one",
                    //         },
                    //     },
                    // }, {
                    //     format: "r8unorm",
                    //     blend: {
                    //         color: {
                    //             operation: "add",
                    //             srcFactor: "src-alpha",
                    //             dstFactor: "dst-alpha",
                    //         },
                    //         alpha: {
                    //             operation: "add",
                    //             srcFactor: "one",
                    //             dstFactor: "one",
                    //         },
                    //     },
                    //     // writeMask: 0,
                    // }],
                    targets: [{
                        // format: "r8unorm",
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
                        // writeMask: 0,
                    }],
                },
                primitive: {
                    topology: "triangle-list",
                },
            });
        }
    }
    async render(encoder: GPUCommandEncoder) {
        if (this.pipeline == null) {
            return;
        }
        let pass;
        if (this.dir == "render/useless" || this.dir == "render/useless2") {
            // pass = encoder.beginRenderPass({
            //     label: this.dir,
            //     // colorAttachments: [{
            //     //     view: ctx.getCurrentTexture().createView(),
            //     //     loadOp: "load",
            //     //     storeOp: "store",
            //     // }, {
            //     //     view: motionBlurTextureView,
            //     //     loadOp: "load",
            //     //     storeOp: "store",
            //     // }],
            //     colorAttachments: [{
            //         view: ctx.getCurrentTexture().createView(),
            //         // loadOp: "load",
            //         loadOp: "clear",
            //         clearValue: [0, 0, 0, 1],
            //         // clearValue: [0, (performance.now() / 1000 % 10) / 10, 0, 1],
            //         storeOp: "store",
            //     }],
            // });
            // pass.setPipeline(this.pipeline);
            // pass.setVertexBuffer(0, vertexBuffer);
            // // pass.setVertexBuffer(1, particleBuffer);
            // pass.setIndexBuffer(indexBuffer, "uint32");
            // pass.setBindGroup(0, cameraBindGroup);
            // pass.setBindGroup(1, motionBlurTextureBindGroup);
            // pass.drawIndexed(INDICES.length, 1);

            // pass.end();
        }
        else {
            pass = encoder.beginRenderPass({
                label: this.dir,
                colorAttachments: [{
                    view: this.renderer.ctx.getCurrentTexture().createView(),
                    loadOp: "load",
                    storeOp: "store",
                // }, {
                //     view: motionBlurTextureView,
                //     loadOp: "load",
                //     storeOp: "store",
                }],
                // colorAttachments: [{
                //     view: motionBlurTextureView,
                //     loadOp: "load",
                //     // loadOp: "clear",
                //     clearValue: [0, 0, 0, 1],
                //     // clearValue: [0, (performance.now() / 1000 % 10) / 10, 0, 1],
                //     storeOp: "store",
                // }],
            });
            pass.setPipeline(this.pipeline);
            pass.setVertexBuffer(0, this.renderer.vertexBuffer);
            pass.setIndexBuffer(this.renderer.indexBuffer, "uint32");
            pass.setBindGroup(0, this.renderer.cameraBindGroup);
            pass.setBindGroup(1, this.renderer.renderBindGroup);
            pass.drawIndexed(this.renderer.indexBuffer.size / 4, 1);

            pass.end();
        }
    }
}
// class ComputePass {
//     renderer;
//     dir;

//     shader: string;
//     module: GPUShaderModule;
//     layout: GPUPipelineLayout;
//     pipeline: GPURenderPipeline;

//     constructor(renderer: WebgpuMapRenderer, dir: string) {
//         this.renderer = renderer;
//         this.dir = dir;
//     }
//     async init() {
//         this.shader = await (await fetch("./src/passes/" + this.dir + ".wgsl")).text();
//         if (this.shader == null) {
//             throw new Error("no shader found buh");
//         }

//         this.module = device.createShaderModule({
//             label: this.dir,
//             code: this.shader,
//         });

//         this.layout = device.createPipelineLayout({
//             bindGroupLayouts: [
//                 this.renderer.cameraBindGroupLayout,
//                 this.renderer.computeGridBindGroupLayout,
//             ],
//         });

//         this.pipeline = device.createComputePipeline({
//             label: this.dir,
//             layout: this.layout,
//             compute: {
//                 module: this.module,
//                 entryPoint: "main",
//             },
//         });
//     }
//     async render(encoder) {
//         if (this.dir == "compute/setup" && tick > 10000) {
//             // if (this.dir == "compute/setup" && tick > 1000) {
//             // if (this.dir == "compute/setup" && tick > 200) {
//             // if (this.dir == "compute/setup" && tick > 2) {
//             return;
//         }
//         const pass = encoder.beginComputePass({
//             label: this.dir,
//         });

//         pass.setPipeline(this.pipeline);
//         pass.setBindGroup(0, cameraBindGroup);
//         pass.setBindGroup(1, computeGridBindGroup);
//         // pass.setBindGroup(2, randomSeedBindGroup);
//         // pass.dispatchWorkgroups(particles);
//         // pass.dispatchWorkgroups(gridSize / 16 * gridSize / 16 / 16);
//         // pass.dispatchWorkgroups(gridSize / 16 / 4, gridSize / 16 / 4);
//         // pass.dispatchWorkgroups(gridSize / chunkSize, gridSize / chunkSize);
//         pass.dispatchWorkgroups(gridSize / chunkSize / 8, gridSize / chunkSize / 8);
//         // pass.dispatchWorkgroups(1000);
//         pass.end();
//     }
// }

export { webgpuSupported, WebgpuMapRenderer }