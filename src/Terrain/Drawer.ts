import { DrawSystem } from "./DrawSystem";
import { glMatrix, vec2, vec3, vec4, mat3, mat4 } from "gl-matrix";
import { UnitBox, Sphere, Geometry } from "./Geometry";
import { RenderPipelineBuilder } from "./RenderPipelineBuilder";
import { WGPUContext } from "../utils/WgpuContext";
import { DefaultRenderTarget } from "./DrawUtil";

import textureUrl from "../assets/texture.png?url";
import { Texture2D, TextureConstant } from "./Texture";
import { ComputePipelineBuilder } from "./ComputePipelineBuilder";

import shaderSrc from "./Shader.wgsl?raw";
import textureDebugShaderSrc from "./TextureDebugShader.wgsl?raw";
import computeShaderSrc from "./CShader.wgsl?raw";

import terrainShaderSrc from "./TerrainShader.wgsl?raw";


// import
import textureGrassUrl from '../assets/terrain/grass.jpg?url'
import textureDirtUrl from '../assets/terrain/dirt.jpg?url'
import textureRockUrl from '../assets/terrain/rock.jpg?url'
import textureSandUrl from '../assets/terrain/sand.jpg?url'
import textureSnowUrl from '../assets/terrain/snow.jpg?url'

const TERRAIN_TEXTURE_URLS = [
  textureGrassUrl,
  textureDirtUrl,
  textureSandUrl,
  textureRockUrl,
  textureSnowUrl,
] ;

export class Drawer extends DrawSystem {
  sphere: Geometry | undefined;
  renderBundle: GPURenderBundle | undefined;
  textureDebugBundle: GPURenderBundle | undefined;
  terrainBundle: GPURenderBundle | undefined;

  modelView: mat4 = mat4.create();

  myTexture: Texture2D | undefined;
  computePipeline: GPUComputePipeline | undefined;
  computeBindGroup: GPUBindGroup | undefined;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
  }

  async InitSphereMesh() {
    if (!this.myTexture) throw new Error("Texture2D no good");

    this.sphere = new Sphere(2, vec3.fromValues(0, 0, 0), 256, 256);
    this.sphere.GenerateVBO(this.ctx?.device as GPUDevice);
    this.sphere.GenerateIBO(this.ctx?.device as GPUDevice);
    this.sphere.GenerateUBO(this.ctx?.device as GPUDevice);

    const pipelineBuilder = new RenderPipelineBuilder(this.ctx as WGPUContext);
    const target = this.drawUtil?.GetRenderTarget() as DefaultRenderTarget;

    const pipeline = await pipelineBuilder
      .SetVertexState(
        this.sphere.GetVertexAttributeLayouts(),
        shaderSrc,
        "vs_main"
      )
      .SetFragState(target.colorAttachment.format, shaderSrc, "fs_main")
      .SetDepthStencil(target.depthStencil?.format as GPUTextureFormat)
      .SetPrimitiveState("triangle-list", "back", "ccw")
      .BuildAsync();

    const bundleEncoder = this.ctx?.device.createRenderBundleEncoder({
      colorFormats: [target.colorAttachment.format],
      depthStencilFormat: target.depthStencil?.format,
    }) as GPURenderBundleEncoder;

    const bindGroup = this.ctx?.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.sphere.ubo as GPUBuffer, label: "ubo" },
        },
        { binding: 1, resource: this.myTexture.sampler as GPUSampler },
        {
          binding: 2,
          resource: this.myTexture.texture?.createView() as GPUTextureView,
        },
      ],
      label: "bind group",
    }) as GPUBindGroup;

    bundleEncoder.setPipeline(pipeline);
    bundleEncoder.setVertexBuffer(0, this.sphere.vbo as GPUBuffer);
    bundleEncoder.setIndexBuffer(this.sphere.ibo as GPUBuffer, "uint16");
    bundleEncoder.setBindGroup(0, bindGroup);
    bundleEncoder.drawIndexed(this.sphere.indices.length);

    this.renderBundle = bundleEncoder.finish();
  }

  async ConfigureTextureDebuggerPipeline() {
    if (!this.ctx) throw new Error("BAD WGPUContext");
    if (!this.myTexture) throw new Error("Texture2D no good");

    const pipelineBuilder = new RenderPipelineBuilder(this.ctx as WGPUContext);
    const target = this.drawUtil?.GetRenderTarget() as DefaultRenderTarget;

    const pipeline = await pipelineBuilder
      .SetVertexState([], textureDebugShaderSrc, "vs_main")
      .SetFragState(
        target.colorAttachment.format,
        textureDebugShaderSrc,
        "fs_main"
      )
      .SetPrimitiveState("triangle-list", "none")
      .BuildAsync();

    const bindGroup = this.ctx.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.myTexture.sampler as GPUSampler },
        {
          binding: 1,
          resource: this.myTexture.texture?.createView() as GPUTextureView,
        },
      ],
      label: "texture debug bind group",
    });

    const bundleEncoder = this.ctx.device.createRenderBundleEncoder({
      colorFormats: [target.colorAttachment.format],
    }) as GPURenderBundleEncoder;
    bundleEncoder.setPipeline(pipeline);
    bundleEncoder.setBindGroup(0, bindGroup);
    bundleEncoder.draw(6);
    this.textureDebugBundle = bundleEncoder.finish();
  }

  async InitTextureDebugger(url: string) {
    if (!this.ctx) throw new Error("can't get WGPU context");

    this.myTexture = await Texture2D.FromURL(
      this.ctx.device,
      url,
      TextureConstant.DefaultTextureUsage
    );

    await this.ConfigureTextureDebuggerPipeline();
  }

  async GenProceduralTextureWithComputeShader() {
    if (!this.ctx) throw new Error("this.ctx is undefined");

    this.myTexture = Texture2D.Create(this.ctx.device, {
      size: [256, 256],
      dimension: "2d",
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.COPY_SRC |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    await this.ConfigureTextureDebuggerPipeline();

    const computeBuilder = new ComputePipelineBuilder(this.ctx);

    this.computePipeline = computeBuilder
      .SetCSState(computeShaderSrc, "cs_main")
      .SetPipelineLayout([
        [
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            storageTexture: {
              format: "rgba8unorm",
              access: "write-only",
              viewDimension: "2d",
            },
          },
        ],
      ])
      .Build();
    this.computeBindGroup = this.ctx.device.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: this.myTexture.texture?.createView() as GPUTextureView,
        },
      ],
      label: "compute pipeline bindGroupLayout",
    });
  }

  async GenTerrain() {
    if (!this.ctx) throw new Error("no wgpu context ava");
    if (!this.drawUtil) throw new Error("no draw util");
    if (!this.sphere?.ubo) throw new Error("no ubo ava");
    if (!this.myTexture) throw new Error("Texture2D no good");

    const GridRez = 256;
    const indices: number[] = [];
    for (let r = 0; r < GridRez - 1; r++) {
      for (let c = 0; c < GridRez - 1; c++) {
        indices.push(r * GridRez + c);
        indices.push((r + 1) * GridRez + c);
        indices.push((r + 1) * GridRez + c + 1);

        indices.push(r * GridRez + c);
        indices.push((r + 1) * GridRez + c + 1);
        indices.push(r * GridRez + c + 1);
      }
    }
    const iboHostData = new Uint32Array(indices);
    const ibo = this.ctx.device.createBuffer({
      size: iboHostData.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    this.ctx.device.queue.writeBuffer(ibo, 0, iboHostData);

    // texture for splatting
    const terrainTextureArray = await Texture2D.FromManyURL(
      this.ctx.device,
      TERRAIN_TEXTURE_URLS,
      TextureConstant.DefaultTextureUsage
    );

    const pipelineBuilder = new RenderPipelineBuilder(this.ctx as WGPUContext);
    const target = this.drawUtil.GetRenderTarget() as DefaultRenderTarget;
    if (!target.depthStencil) throw new Error("can't acquire depth");

    const pipeline = await pipelineBuilder
      .SetVertexState([], terrainShaderSrc, "vs_main")
      .SetFragState(target.colorAttachment.format, terrainShaderSrc, "fs_main")
      .SetDepthStencil(target.depthStencil.format as GPUTextureFormat)
      .SetPrimitiveState("triangle-list", "none", "ccw")
      .BuildAsync();

    const bindGroup = this.ctx.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.sphere.ubo as GPUBuffer, label: "ubo" },
        },
        { binding: 1, resource: this.myTexture.sampler as GPUSampler },
        {
          binding: 2,
          resource: this.myTexture.texture?.createView() as GPUTextureView,
        },
        {
          binding: 3,
          resource: terrainTextureArray.texture.createView({
            arrayLayerCount: terrainTextureArray.texture.depthOrArrayLayers,
            dimension: "2d-array",
            baseArrayLayer: 0,
            format: "rgba8unorm",
          }),
        },
      ],
      label: "bind group",
    }) as GPUBindGroup;

    const encoder = this.ctx.device.createRenderBundleEncoder({
      colorFormats: [target.colorAttachment.format],
      depthStencilFormat: target.depthStencil.format,
    });
    encoder.setPipeline(pipeline);
    encoder.setIndexBuffer(ibo, 'uint32');
    encoder.setBindGroup(0, bindGroup);
    encoder.drawIndexed(iboHostData.length);
    this.terrainBundle = encoder.finish();
  }

  async Initialize(): Promise<boolean> {
    if (!this.drawUtil) throw new Error("draw util no goog");

    // init camera position
    const ratio = this.drawUtil.GetWidth() / this.drawUtil.GetHeight();
    this.camera.ConfigureMovementSensitivity(2);
    this.camera.SetPerspectiveProj(glMatrix.toRadian(60), ratio, 0.01, 5000);
    this.camera.FromLookAt(vec3.fromValues(-5, 30, 10), vec3.fromValues(5, 5, 0));

    this.drawUtil?.GenRenderTarget(true);

    // 1st. Make sure regular texture loads
    //await this.InitTextureDebugger(textureUrl);

    await this.GenProceduralTextureWithComputeShader();
    await this.InitSphereMesh();
    await this.GenTerrain();

    return true;
  }

  Update(): void {
    this.input.Update(this.deltaTS);
  }

  Draw(): void {
    if (!this.drawUtil) throw new Error("draw util no goog");
    if (!this.computePipeline) throw new Error("computePipeline no good");
    if (!this.computeBindGroup) throw new Error("computeBindGroup no good");

    const model = mat4.identity(mat4.create());

    this.sphere?.UpdateTransform(
      this.ctx?.device as GPUDevice,
      mat4.mul(this.modelView, this.camera.GetView(), model),
      this.camera.proj
    );

    const encoder =
      this.ctx?.device.createCommandEncoder() as GPUCommandEncoder;

    // compute pass
    {
      // TODO:
      const computePass = encoder.beginComputePass({ label: "compute pass" });
      computePass.setPipeline(this.computePipeline);
      computePass.setBindGroup(0, this.computeBindGroup);
      computePass.dispatchWorkgroups(256, 256, 1);
      computePass.end();
    }

    const target = this.drawUtil?.GetRenderTarget() as DefaultRenderTarget;
    // sphere draw
    // {
    //   const renderPass = encoder.beginRenderPass({
    //     colorAttachments: [
    //       {
    //         loadOp: "clear",
    //         storeOp: "store",
    //         view: target.colorAttachment.createView(),
    //         clearValue: [0.2, 0.5, 0.8, 1.0],
    //       },
    //     ],
    //     depthStencilAttachment: {
    //       depthLoadOp: "clear",
    //       depthStoreOp: "store",
    //       depthClearValue: 1.0,
    //       view: target.depthStencil?.createView() as GPUTextureView,
    //     },
    //     label: "render pass",
    //   }) as GPURenderPassEncoder;
    //   renderPass.executeBundles([this.renderBundle as GPURenderBundle]);
    //   renderPass.end();
    // }

    //terrain draw
    {
      const renderPass = encoder.beginRenderPass({
        colorAttachments: [
          {
            loadOp: "clear",
            storeOp: "store",
            view: target.colorAttachment.createView(),
            clearValue: [0.2, 0.5, 0.8, 1.0],
          },
        ],
        depthStencilAttachment: {
          depthLoadOp: "clear",
          depthStoreOp: "store",
          depthClearValue: 1.0,
          view: target.depthStencil?.createView() as GPUTextureView,
        },
        label: "render pass: terrain",
      }) as GPURenderPassEncoder;
      renderPass.executeBundles([this.terrainBundle as GPURenderBundle]);
      renderPass.end();
    }

    // texture draw
    {
      const renderPass = encoder.beginRenderPass({
        colorAttachments: [
          {
            loadOp: "load",
            storeOp: "store",
            view: target.colorAttachment.createView(),
            clearValue: [1.0, 0.2, 0.5, 1.0],
          },
        ],
        label: "render pass: texture debug view port",
      }) as GPURenderPassEncoder;

      const w = this.drawUtil.GetWidth() / 4;
      const h = this.drawUtil.GetHeight() / 4;

      renderPass.setViewport(0, 0, w, h, 0, 1);
      renderPass.executeBundles([this.textureDebugBundle as GPURenderBundle]);
      renderPass.end();
    }

    this.ctx?.device.queue.submit([encoder.finish()]);
  }
}
