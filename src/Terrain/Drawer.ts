import { DrawSystem } from "./DrawSystem";
import { glMatrix, vec2, vec3, vec4, mat3, mat4 } from "gl-matrix";
import { UnitBox } from "./Geometry";
import { RenderPipelineBuilder } from "./PipelineBuilder";
import { WGPUContext } from "../utils/WgpuContext";
import shaderSrc from "./Shader.wgsl?raw";
import { DefaultRenderTarget } from "./DrawUtil";

export class Drawer extends DrawSystem {
  box: UnitBox | undefined;
  pipelineBuilder: RenderPipelineBuilder | undefined;
  pipeline: GPURenderPipeline | undefined;
  renderBundle: GPURenderBundle | undefined;

  modelView: mat4 = mat4.create();

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
  }

  async Initialize(): Promise<boolean> {
    // init camera position
    const ratio =
      (this.ctx?.canvasCtx.getCurrentTexture().width as number) /
      (this.ctx?.canvasCtx.getCurrentTexture().height as number);
    this.camera.SetPerspectiveProj(glMatrix.toRadian(60), ratio, 0.01, 500);
    this.camera.FromLookAt(vec3.fromValues(0, 2, 5), vec3.fromValues(0, 0, 0));

    this.box = new UnitBox();
    this.box.GenerateVBO(this.ctx?.device as GPUDevice);
    this.box.GenerateIBO(this.ctx?.device as GPUDevice);
    this.box.GenerateUBO(this.ctx?.device as GPUDevice);

    this.pipelineBuilder = new RenderPipelineBuilder(this.ctx as WGPUContext);
    this.drawUtil?.GenRenderTarget(true);
    const target = this.drawUtil?.GetRenderTarget() as DefaultRenderTarget;

    this.pipeline = await this.pipelineBuilder
      .SetVertexState(
        this.box.GetVertexAttributeLayouts(),
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
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.box.ubo as GPUBuffer, label: "ubo" },
        },
      ],
      label: "bind group",
    }) as GPUBindGroup;

    bundleEncoder.setPipeline(this.pipeline);
    bundleEncoder.setVertexBuffer(0, this.box.vbo as GPUBuffer);
    bundleEncoder.setIndexBuffer(this.box.ibo as GPUBuffer, "uint16");
    bundleEncoder.setBindGroup(0, bindGroup);
    bundleEncoder.drawIndexed(this.box.indices.length);

    this.renderBundle = bundleEncoder.finish();

    return true;
  }

  Update(): void {}

  Draw(): void {
    const model = mat4.identity(mat4.create());

    this.box?.UpdateTransform(
      this.ctx?.device as GPUDevice,
      mat4.mul(this.modelView, this.camera.GetView(), model),
      this.camera.proj
    );

    const target = this.drawUtil?.GetRenderTarget() as DefaultRenderTarget;
    const encoder =
      this.ctx?.device.createCommandEncoder() as GPUCommandEncoder;
    const renderPass = encoder?.beginRenderPass({
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

    this.ctx?.device.queue.submit([encoder.finish()]);
  }
}
