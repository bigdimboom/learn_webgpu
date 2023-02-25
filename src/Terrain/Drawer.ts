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

export class Drawer extends DrawSystem {
  sphere: Geometry | undefined;
  pipelineBuilder: RenderPipelineBuilder | undefined;
  renderBundle: GPURenderBundle | undefined;
  textureDebugBundle: GPURenderBundle | undefined;

  modelView: mat4 = mat4.create();

  myTexture: Texture2D | undefined;
  computePipeline: GPUComputePipeline | undefined;
  computeBindGroup: GPUBindGroup | undefined;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
  }

  async InitMesh() {
    if (!this.myTexture) throw new Error("Texture2D no good");

    this.sphere = new Sphere(2, vec3.fromValues(0, 0, 0), 256, 256);
    this.sphere.GenerateVBO(this.ctx?.device as GPUDevice);
    this.sphere.GenerateIBO(this.ctx?.device as GPUDevice);
    this.sphere.GenerateUBO(this.ctx?.device as GPUDevice);

    this.pipelineBuilder = new RenderPipelineBuilder(this.ctx as WGPUContext);
    const target = this.drawUtil?.GetRenderTarget() as DefaultRenderTarget;

    const pipeline = await this.pipelineBuilder
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

    this.pipelineBuilder = new RenderPipelineBuilder(this.ctx as WGPUContext);
    const target = this.drawUtil?.GetRenderTarget() as DefaultRenderTarget;

    const pipeline = await this.pipelineBuilder
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

  async Initialize(): Promise<boolean> {
    if (!this.drawUtil) throw new Error("draw util no goog");

    // init camera position
    const ratio = this.drawUtil.GetWidth() / this.drawUtil.GetHeight();
    this.camera.SetPerspectiveProj(glMatrix.toRadian(60), ratio, 0.01, 500);
    this.camera.FromLookAt(vec3.fromValues(0, 2, 5), vec3.fromValues(0, 0, 0));

    this.drawUtil?.GenRenderTarget(true);

    // 1st. Make sure regular texture loads
    //await this.InitTextureDebugger(textureUrl);

    await this.GenProceduralTextureWithComputeShader();
    await this.InitMesh();

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
        label: "render pass",
      }) as GPURenderPassEncoder;
      renderPass.executeBundles([this.renderBundle as GPURenderBundle]);
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
        label: "render pass 2",
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
