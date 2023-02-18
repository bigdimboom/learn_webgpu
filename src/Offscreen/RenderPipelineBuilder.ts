import { WGPUContext } from "../utils/WgpuContext";

export class RenderPipelineBuilder {
  vsSrc: string;
  fsSrc: string;
  vsEntryPoint: string;
  fsEntryPoint: string;
  primitiveState: GPUPrimitiveState;
  targetStates: GPUColorTargetState[];
  pipelineLayout : GPUPipelineLayout | 'auto';
  depthStencilState?: GPUDepthStencilState;
  bufferLayouts?: GPUVertexBufferLayout[];

  constructor(
    public ctx: WGPUContext,
    vsSrc: string,
    fsSrc: string,
    depth: boolean
  ) {
    
    this.vsEntryPoint = "vs_main";
    this.fsEntryPoint = "fs_main";
    this.vsSrc = vsSrc;
    this.fsSrc = fsSrc;
    
    this.primitiveState = {
      topology: "triangle-list",
      cullMode: "back",
      frontFace: "ccw",
    };

    this.targetStates = [
      {
        format: ctx.format
      },
    ];

    this.pipelineLayout = 'auto';

    if (depth) {
      this.depthStencilState = {
        format: "depth24plus",
        depthCompare: "less",
        depthWriteEnabled: true,
      };
    }
  }

  SetVertexShader(shaderSrc: string, entryPoint: string = "vs_main") {
    this.vsSrc = shaderSrc;
    this.vsEntryPoint = entryPoint;
  }

  SetFragmentShader(shaderSrc: string, entryPoint: string = "fs_main") {
    this.fsSrc = shaderSrc;
    this.fsEntryPoint = entryPoint;
  }

  SetPrimitiveState(primitiveState: GPUPrimitiveState) {
    this.primitiveState = primitiveState;
  }

  SetDepthStencil(dsState: GPUDepthStencilState) {
    this.depthStencilState = dsState;
  }

  SetColorTargetStates(colorTargetStates: GPUColorTargetState[]) {
    this.targetStates = colorTargetStates;
  }

  SetBlendStates(blendState: GPUBlendState)
  {
    this.targetStates.map((val, i, arr)=>{
        arr[i].blend = blendState;
    });
  }

  SetVertexBufferLayouts(bufferLayouts: GPUVertexBufferLayout[]) {
    this.bufferLayouts = bufferLayouts;
  }

  SetPipelineLayout(layout: GPUPipelineLayout | 'auto')
  {
    this.pipelineLayout = layout;
  }

  Build() {
    return this.ctx.device.createRenderPipeline({
      layout: this.pipelineLayout,
      vertex: {
        entryPoint: this.vsEntryPoint,
        module: this.ctx.device.createShaderModule({
          code: this.vsSrc,
          label: "Vertex Shader Module",
        }),
        buffers: this.bufferLayouts,
      },
      fragment: {
        entryPoint: this.fsEntryPoint,
        module: this.ctx.device.createShaderModule({
          code: this.fsSrc,
          label: "fragment Shader Module",
        }),
        targets: this.targetStates,
      },
      primitive: this.primitiveState,
      depthStencil: this.depthStencilState,
      label: "Render Pipeline",
    });
  }
}
