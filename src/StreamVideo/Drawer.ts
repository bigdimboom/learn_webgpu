import { Texture2D, TextureConstant } from "../Terrain/Texture";
import { DrawSystem } from "../utils/DrawSystem";
import { UnitBox } from "../utils/Geometry";
import textureUrl from "../assets/texture.png?url";
import { RenderPipelineBuilder } from "../utils/RenderPipelineBuilder";
// import externalTextureDebugShaderSrc from "../utils/shader/ExternalTextureDebuggerShader.wgsl?raw";

import { ComputePipelineBuilder } from "../utils/ComputePipelineBuilder";
import processingShader from "./ProcessingShader.wgsl?raw";
import meshShader from "./MeshShader.wgsl?raw";
import { glMatrix, mat4, vec3 } from "gl-matrix";

export class Drawer extends DrawSystem {
  constructor(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
    super(canvas);
    this.video = video;
  }

  video: HTMLVideoElement;

  eTSampler: GPUSampler;
  externalTexture: GPUExternalTexture;
  eTBundle: GPURenderBundle;

  processingPipe: GPUComputePipeline;
  processingBindGroup: GPUBindGroup;

  debugTBundle: GPURenderBundle;

  meshDrawBundle: GPURenderBundle;

  model: mat4 = mat4.identity(mat4.create());
  modelView: mat4 = mat4.identity(mat4.create());

  async Initialize(): Promise<boolean> {
    if (!this.ctx) throw new Error("no wgpu context has established");
    if (!this.drawUtil) throw new Error("no drawUtil has established");

    const target = this.drawUtil.GenRenderTarget(true);
    const canvasRez = {
      w: target.colorAttachment.width,
      h: target.colorAttachment.height,
    };

    const ratio = this.drawUtil.GetWidth() / this.drawUtil.GetHeight();
    this.camera.ConfigureMovementSensitivity(2);
    this.camera.SetPerspectiveProj(glMatrix.toRadian(60), ratio, 0.01, 5000);
    this.camera.FromLookAt(vec3.fromValues(0, 1, 10), vec3.fromValues(0, 0, 0));

    {
      // compute shader
      this.processingPipe = await new ComputePipelineBuilder(this.ctx)
        .SetCSState(processingShader, "cs_main")
        .BuildAsync();
    }

    // const texture = await Texture2D.FromURL(
    //   this.ctx.device,
    //   textureUrl,
    //   TextureConstant.DefaultTextureUsage
    // );

    let started = false;
    let texture: GPUTexture | undefined;
    let rezBuffer: GPUBuffer | undefined;
    let box: UnitBox;

    const callback = () => {
      if (!this.ctx) throw new Error("no wgpu context has established");
      if (!this.drawUtil) throw new Error("no drawUtil has established");

      const videoRez = { w: this.video.videoWidth, h: this.video.videoHeight };

      if (!started) {
        texture = this.ctx.device.createTexture({
          format: "rgba8unorm",
          size: [videoRez.w, videoRez.h, 1],
          usage:
            TextureConstant.DefaultTextureUsage |
            GPUTextureUsage.STORAGE_BINDING,
          label: "abc texture",
        });

        rezBuffer = this.ctx.device.createBuffer({
          size: 4 * 2,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.ctx.device.queue.writeBuffer(
          rezBuffer,
          0,
          new Uint32Array([videoRez.w, videoRez.h])
        );

        this.eTSampler = this.ctx.device.createSampler();
        this.debugTBundle = this.drawUtil.GenTextureDebuggerBundle(
          texture,
          this.ctx.device.createSampler()
        );
        started = true;

        // drawing mesh
        {
          box = new UnitBox();
          box.GenerateVBO(this.ctx.device);
          box.GenerateIBO(this.ctx.device);
          box.GenerateUBO(this.ctx.device);

          const pipeline = new RenderPipelineBuilder(this.ctx)
            .SetVertexState(
              box.GetVertexAttributeLayouts(),
              meshShader,
              "vs_main"
            )
            .SetFragState(target.colorAttachment.format, meshShader, "fs_main")
            .SetDepthStencil(target.depthStencil?.format as GPUTextureFormat)
            .SetPrimitiveState("triangle-list", "back", "ccw")
            .Build();

          const bundleEncoder = this.ctx.device.createRenderBundleEncoder({
            colorFormats: [target.colorAttachment.format],
            depthStencilFormat: target.depthStencil?.format,
          }) as GPURenderBundleEncoder;

          const bindGroup = this.ctx?.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
              {
                binding: 0,
                resource: { buffer: box.ubo as GPUBuffer, label: "ubo" },
              },
              { binding: 1, resource: this.ctx.device.createSampler() },
              {
                binding: 2,
                resource: texture.createView() as GPUTextureView,
              },
            ],
            label: "bind group",
          }) as GPUBindGroup;

          bundleEncoder.setPipeline(pipeline);
          bundleEncoder.setVertexBuffer(0, box.vbo as GPUBuffer);
          bundleEncoder.setIndexBuffer(box.ibo as GPUBuffer, "uint16");
          bundleEncoder.setBindGroup(0, bindGroup);
          bundleEncoder.drawIndexed(box.indices.length);

          this.meshDrawBundle = bundleEncoder.finish();
        }
      }

      this.externalTexture = this.ctx.device.importExternalTexture({
        source: this.video,
      });

      this.eTBundle = this.drawUtil.GenExternalTextureDebuggerBundle(
        this.externalTexture,
        this.eTSampler
      );

      this.processingBindGroup = this.ctx.device.createBindGroup({
        layout: this.processingPipe.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: this.externalTexture },
          { binding: 1, resource: texture?.createView() as GPUTextureView },
          { binding: 2, resource: { buffer: rezBuffer as GPUBuffer } },
        ],
        label: "external texture debug bind group",
      });

      // update ubo

      mat4.rotateY(
        this.model,
        this.model,
        glMatrix.toRadian(0.1 * this.deltaTS)
      );
      box.UpdateTransform(
        this.ctx?.device as GPUDevice,
        mat4.mul(this.modelView, this.camera.GetView(), this.model),
        this.camera.proj
      );

      const renderTarget = this.drawUtil.GetRenderTarget();
      const encoder = this.ctx.device.createCommandEncoder();

      {
        const cp = encoder.beginComputePass();
        cp.setPipeline(this.processingPipe);
        cp.setBindGroup(0, this.processingBindGroup);
        cp.dispatchWorkgroups(videoRez.w, videoRez.h, 1);
        cp.end();
      }

      {
        const renderPass = encoder.beginRenderPass({
          colorAttachments: [
            {
              loadOp: "clear",
              storeOp: "store",
              view: renderTarget.colorAttachment.createView(),
              clearValue: [0.2, 0.5, 0.8, 1.0],
            },
          ],
          depthStencilAttachment: {
            view: renderTarget.depthStencil?.createView() as GPUTextureView,
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store",
          },
          label: "render pass: textured mesh",
        }) as GPURenderPassEncoder;

        renderPass.executeBundles([this.meshDrawBundle]);
        renderPass.end();
      }

      // texture preview
      {
        const renderPass = encoder.beginRenderPass({
          colorAttachments: [
            {
              loadOp: "load",
              storeOp: "store",
              view: renderTarget.colorAttachment.createView(),
              // clearValue: [0.2, 0.5, 0.8, 1.0],
            },
          ],
          label: "render pass: external texture debug",
        }) as GPURenderPassEncoder;

        // external texture
        renderPass.setViewport(0, 0, canvasRez.w / 4, canvasRez.h / 4, 0, 1);
        renderPass.executeBundles([this.eTBundle]);
        // compute shader result
        renderPass.setViewport(
          0,
          canvasRez.h / 4,
          canvasRez.w / 4,
          canvasRez.h / 4,
          0,
          1
        );
        renderPass.executeBundles([this.debugTBundle]);

        renderPass.end();
      }

      // // compute buffer result
      // {
      //   const renderPass = encoder.beginRenderPass({
      //     colorAttachments: [
      //       {
      //         loadOp: "load",
      //         storeOp: "store",
      //         view: renderTarget.colorAttachment.createView(),
      //         // clearValue: [0.2, 0.5, 0.8, 1.0],
      //       },
      //     ],
      //     label: "render pass: external texture debug",
      //   }) as GPURenderPassEncoder;

      //   renderPass.setViewport(
      //     0,
      //     canvasRez.h / 4,
      //     canvasRez.w / 4,
      //     canvasRez.h / 4,
      //     0,
      //     1
      //   );
      //   renderPass.executeBundles([this.debugTBundle]);
      //   renderPass.end();
      // }

      this.ctx.device.queue.submit([encoder.finish()]);

      this.video.requestVideoFrameCallback(callback);
    };

    this.video.requestVideoFrameCallback(callback);

    this.video.play();

    return true;
  }

  Update(): void {}

  Draw(): void {
    // if (!this.ctx) throw new Error("no wgpu context has established");
    // if (!this.drawUtil) throw new Error("no drawUtil has established");
    // if (!this.bundle) throw new Error("can't find bundle");
  }
}
