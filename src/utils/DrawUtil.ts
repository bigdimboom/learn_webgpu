import { RenderPipelineBuilder } from "./RenderPipelineBuilder";
import { WGPUContext } from "./WgpuContext";

import textureDebugShaderSrc from "./shader/TextureDebugShader.wgsl?raw";
import externalTextureDebugShaderSrc from "./shader/ExternalTextureDebuggerShader.wgsl?raw";

export interface DefaultRenderTarget {
  colorAttachment: GPUTexture;
  depthStencil?: GPUTexture;
}

export class DrawUtil {
  depthFormat: GPUTextureFormat = "depth24plus";
  depthTexture?: GPUTexture;

  constructor(public ctx: WGPUContext) {}

  SetDepthFormat(format: GPUTextureFormat) {
    this.depthFormat = format;
  }

  GenRenderTarget(useDepth: boolean) {
    if (useDepth === true) {
      const resolution = [
        this.ctx.canvasCtx.getCurrentTexture().width,
        this.ctx.canvasCtx.getCurrentTexture().height,
        1,
      ];
      this.depthTexture = this.ctx.device.createTexture({
        format: this.depthFormat,
        size: resolution,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        label: "depth render target",
      });
    }
    return this.GetRenderTarget();
  }

  GetRenderTarget(): DefaultRenderTarget {
    if (this.depthTexture) {
      return {
        colorAttachment: this.ctx.canvasCtx.getCurrentTexture(),
        depthStencil: this.depthTexture,
      };
    }

    return {
      colorAttachment: this.ctx.canvasCtx.getCurrentTexture(),
    };
  }

  GetWidth(): number {
    return this.ctx.canvasCtx.getCurrentTexture().width;
  }

  GetHeight(): number {
    return this.ctx.canvasCtx.getCurrentTexture().height;
  }

  async GenTextureDebuggerBundleAsync(texture: GPUTexture, sampler: GPUSampler) {
    const renderTarget = this.GetRenderTarget();

    const pipeline = await new RenderPipelineBuilder(this.ctx)
      .SetVertexState([], textureDebugShaderSrc, "vs_main")
      .SetFragState(
        renderTarget.colorAttachment.format,
        textureDebugShaderSrc,
        "fs_main"
      )
      .SetPrimitiveState("triangle-list", "none")
      .BuildAsync();

    const bindGroup = this.ctx.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: texture.createView() },
      ],
      label: "texture debug bind group",
    });

    const bundleEncoder = this.ctx.device.createRenderBundleEncoder({
      colorFormats: [renderTarget.colorAttachment.format],
    }) as GPURenderBundleEncoder;

    bundleEncoder.setPipeline(pipeline);
    bundleEncoder.setBindGroup(0, bindGroup);
    bundleEncoder.draw(6);
    return bundleEncoder.finish();
  }

  GenTextureDebuggerBundle(texture: GPUTexture, sampler: GPUSampler) {
    const renderTarget = this.GetRenderTarget();

    const pipeline = new RenderPipelineBuilder(this.ctx)
      .SetVertexState([], textureDebugShaderSrc, "vs_main")
      .SetFragState(
        renderTarget.colorAttachment.format,
        textureDebugShaderSrc,
        "fs_main"
      )
      .SetPrimitiveState("triangle-list", "none")
      .Build();

    const bindGroup = this.ctx.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: texture.createView() },
      ],
      label: "texture debug bind group",
    });

    const bundleEncoder = this.ctx.device.createRenderBundleEncoder({
      colorFormats: [renderTarget.colorAttachment.format],
    }) as GPURenderBundleEncoder;

    bundleEncoder.setPipeline(pipeline);
    bundleEncoder.setBindGroup(0, bindGroup);
    bundleEncoder.draw(6);
    return bundleEncoder.finish();
  }


  GenExternalTextureDebuggerBundle(texture: GPUExternalTexture, sampler: GPUSampler) {
    const renderTarget = this.GetRenderTarget();

    const pipeline = new RenderPipelineBuilder(this.ctx)
      .SetVertexState([], externalTextureDebugShaderSrc, "vs_main")
      .SetFragState(
        renderTarget.colorAttachment.format,
        externalTextureDebugShaderSrc,
        "fs_main"
      )
      .SetPrimitiveState("triangle-list", "none")
      .Build();

    const bindGroup = this.ctx.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: texture },
      ],
      label: "external texture debug bind group",
    });

    const bundleEncoder = this.ctx.device.createRenderBundleEncoder({
      colorFormats: [renderTarget.colorAttachment.format],
    }) as GPURenderBundleEncoder;

    bundleEncoder.setPipeline(pipeline);
    bundleEncoder.setBindGroup(0, bindGroup);
    bundleEncoder.draw(6);
    return bundleEncoder.finish();
  }
}
