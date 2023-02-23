import { WGPUContext } from "../utils/WgpuContext";

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

  GetWidth() : number
  {
    return this.ctx.canvasCtx.getCurrentTexture().width;
  }

  GetHeight() : number
  {
    return this.ctx.canvasCtx.getCurrentTexture().height;
  }
  
}
