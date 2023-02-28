import { WGPUContext } from "./WgpuContext";

export class ComputePipelineBuilder {
  #compute: GPUProgrammableStage | undefined;
  #layout: GPUPipelineLayout | "auto" = "auto";

  constructor(public ctx: WGPUContext) {}

  SetCSState(shaderCode: string, entryPoint: string = "cs_main") {
    this.#compute = {
      entryPoint: entryPoint,
      module: this.ctx.device.createShaderModule({
        code: shaderCode,
        label: "compute shader module",
      }),
    };
    return this;
  }

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

  async BuildAsync() {
    if (!this.#compute) {
      throw new Error("GPUProgrammableStage Object undefined");
    }

    return this.ctx.device.createComputePipelineAsync({
      layout: this.#layout,
      compute: this.#compute,
      label: "compute pipeline",
    });
  }

  Build() {
    if (!this.#compute) {
      throw new Error("GPUProgrammableStage Object undefined");
    }

    return this.ctx.device.createComputePipeline({
      layout: this.#layout,
      compute: this.#compute,
      label: "compute pipeline",
    });
  }
}
