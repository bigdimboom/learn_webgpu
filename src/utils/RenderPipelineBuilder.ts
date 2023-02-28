import { WGPUContext } from "./WgpuContext";
import { DefaultRenderTarget } from "./DrawUtil";

export enum PipelineConstant {
  VS_ENTRY_POINT = "vs_main",
  FS_ENTRY_POINT = "fs_main",
}

export class RenderPipelineBuilder {
  #primitive: GPUPrimitiveState | undefined;
  #fragment: GPUFragmentState | undefined;
  #depth: GPUDepthStencilState | undefined;
  #vertex: GPUVertexState | undefined;
  #layout: GPUPipelineLayout | "auto" = "auto";

  constructor(public ctx: WGPUContext) {}

  SetPipelineLayout(entries: Iterable<Iterable<GPUBindGroupLayoutEntry>>) {
    const layouts: GPUBindGroupLayout[] = [];
    for (const subArray of entries) {
      const bindGroupLayout = this.ctx.device.createBindGroupLayout({
        entries: subArray,
        label: "bind group layout",
      });
      layouts.push(bindGroupLayout);
    }

    this.#layout = this.ctx.device.createPipelineLayout({
      bindGroupLayouts: layouts,
      label: "pipeline layout",
    });

    return this;
  }

  SetVertexState(
    vboLayouts: Iterable<GPUVertexBufferLayout>,
    vsCode: string,
    entryPoint: string = PipelineConstant.VS_ENTRY_POINT
  ): RenderPipelineBuilder {
    this.#vertex = {
      entryPoint: entryPoint,
      buffers: vboLayouts,
      module: this.ctx.device.createShaderModule({
        code: vsCode,
        label: "vertex shader",
      }),
    };
    return this;
  }

  SetFragState(
    format: GPUTextureFormat,
    fsCode: string,
    entryPoint: string = PipelineConstant.FS_ENTRY_POINT,
    blendState?: GPUBlendState
  ): RenderPipelineBuilder {
    this.#fragment = {
      entryPoint: entryPoint,
      targets: [{ format: format, blend: blendState }],
      module: this.ctx.device.createShaderModule({
        code: fsCode,
        label: "frag shader",
      }),
    };
    return this;
  }

  SetDepthStencil(
    depthFormat: GPUTextureFormat,
    depthCompare: GPUCompareFunction = "less"
  ): RenderPipelineBuilder {
    this.#depth = {
      format: depthFormat,
      depthCompare: depthCompare,
      depthWriteEnabled: true,
    };

    return this;
  }

  SetPrimitiveState(
    topology: GPUPrimitiveTopology = "triangle-list",
    cullMode: GPUCullMode = "back",
    frontFace: GPUFrontFace = "ccw"
  ): RenderPipelineBuilder {
    this.#primitive = {
      topology: topology,
      cullMode: cullMode,
      frontFace: frontFace,
    };
    return this;
  }

  async BuildAsync(): Promise<GPURenderPipeline> {
    if (!this.#vertex) throw Error("Vertex State is not set");

    return this.ctx.device.createRenderPipelineAsync({
      layout: this.#layout,
      vertex: this.#vertex,
      depthStencil: this.#depth,
      fragment: this.#fragment,
      primitive: this.#primitive,
      label: "RenderPipeline",
    });
  }

  Build(): GPURenderPipeline {
    if (!this.#vertex) throw Error("Vertex State is not set");

    return this.ctx.device.createRenderPipeline({
      layout: this.#layout,
      vertex: this.#vertex,
      depthStencil: this.#depth,
      fragment: this.#fragment,
      primitive: this.#primitive,
      label: "RenderPipeline",
    });
  }
}
