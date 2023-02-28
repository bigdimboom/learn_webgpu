import { Texture2D, TextureConstant } from "../Terrain/Texture";
import { DrawSystem } from "../utils/DrawSystem";
import { UnitBox } from "../utils/Geometry";
import textureUrl from "../assets/texture.png?url";
import { createElement } from "react";
import { RenderPipelineBuilder } from "../utils/RenderPipelineBuilder";

import externalTextureDebugShaderSrc from "../utils/shader/ExternalTextureDebuggerShader.wgsl?raw";

export class Drawer extends DrawSystem {
  constructor(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
    super(canvas);
    this.video = video;
  }

  bundle: GPURenderBundle | undefined;
  video: HTMLVideoElement;

  pipeline: GPURenderPipeline;
  sampler: GPUSampler;
  external: GPUExternalTexture;
  bindGroup: GPUBindGroup;

  async Initialize(): Promise<boolean> {
    if (!this.ctx) throw new Error("no wgpu context has established");
    if (!this.drawUtil) throw new Error("no drawUtil has established");

    const renderTarget = this.drawUtil.GenRenderTarget(true);

    // const texture = await Texture2D.FromURL(
    //   this.ctx.device,
    //   textureUrl,
    //   TextureConstant.DefaultTextureUsage
    // );

    // const ex = this.ctx.device.importExternalTexture({
    //   source :  this.video
    // });

    // this.bundle = await this.drawUtil.GenExternalTextureDebuggerBundle(
    //   ex,
    //   this.ctx.device.createSampler({})
    // );

    this.pipeline = await new RenderPipelineBuilder(this.ctx)
      .SetVertexState([], externalTextureDebugShaderSrc, "vs_main")
      .SetFragState(
        renderTarget.colorAttachment.format,
        externalTextureDebugShaderSrc,
        "fs_main"
      )
      .SetPrimitiveState("triangle-list", "none")
      .BuildAsync();

    // this.external = this.ctx.device.importExternalTexture({
    //   source: this.video,
    // });

    // this.bindGroup = this.ctx.device.createBindGroup({
    //   layout: this.pipeline.getBindGroupLayout(0),
    //   entries: [
    //     { binding: 0, resource: this.sampler },
    //     { binding: 1, resource: this.external },
    //   ],
    //   label: "texture debug bind group",
    // });

    // const video = document.createElement("video") as HTMLVideoElement;
    // const src="https://media.w3.org/2010/05/sintel/trailer_hd.mp4";
    // video.src = src;
    // video.load();
    // video.muted = true;

    this.sampler = this.ctx.device.createSampler();
    const callback = () => {
      if (!this.ctx) throw new Error("no wgpu context has established");
      if (!this.drawUtil) throw new Error("no drawUtil has established");

      this.video.requestVideoFrameCallback(callback);

      // console.log("ssss");

      const renderTarget = this.drawUtil.GetRenderTarget();
      const encoder = this.ctx.device.createCommandEncoder();
      const renderPass = encoder.beginRenderPass({
        colorAttachments: [
          {
            loadOp: "clear",
            storeOp: "store",
            view: renderTarget.colorAttachment.createView(),
            clearValue: [0.2, 0.5, 0.8, 1.0],
          },
        ],
        label: "render pass: texture debug",
      }) as GPURenderPassEncoder;
      // renderPass.executeBundles([this.bundle]);

      if (!this.external || this.external.expired) {
        this.external = this.ctx.device.importExternalTexture({
          source: this.video,
        });

        this.bindGroup = this.ctx.device.createBindGroup({
          layout: this.pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: this.sampler },
            { binding: 1, resource: this.external },
          ],
          label: "external texture debug bind group",
        });
      }

      renderPass.setPipeline(this.pipeline);
      renderPass.setBindGroup(0, this.bindGroup);
      renderPass.draw(6);
      renderPass.end();
      this.ctx.device.queue.submit([encoder.finish()]);
    };

    this.video.requestVideoFrameCallback(callback);

    this.video.play();

    return true;
  }

  Update(): void {}

  Draw(): void {
    if (!this.ctx) throw new Error("no wgpu context has established");
    if (!this.drawUtil) throw new Error("no drawUtil has established");
    // if (!this.bundle) throw new Error("can't find bundle");

    // const renderTarget = this.drawUtil.GetRenderTarget();
    // const encoder = this.ctx.device.createCommandEncoder();
    // const renderPass = encoder.beginRenderPass({
    //   colorAttachments: [
    //     {
    //       loadOp: "clear",
    //       storeOp: "store",
    //       view: renderTarget.colorAttachment.createView(),
    //       clearValue: [0.2, 0.5, 0.8, 1.0],
    //     },
    //   ],
    //   label: "render pass: texture debug",
    // }) as GPURenderPassEncoder;
    // // renderPass.executeBundles([this.bundle]);

    // if (!this.external || this.external.expired) {
    //   this.external = this.ctx.device.importExternalTexture({
    //     source: this.video,
    //   });

    //   this.bindGroup = this.ctx.device.createBindGroup({
    //     layout: this.pipeline.getBindGroupLayout(0),
    //     entries: [
    //       { binding: 0, resource: this.sampler },
    //       { binding: 1, resource: this.external },
    //     ],
    //     label: "external texture debug bind group",
    //   });
    // }

    // renderPass.setPipeline(this.pipeline);
    // renderPass.setBindGroup(0, this.bindGroup);
    // renderPass.draw(6);
    // renderPass.end();
    // this.ctx.device.queue.submit([encoder.finish()]);
  }
}
