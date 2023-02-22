import { initWebGPU, WGPUContext } from "../utils/WgpuContext";

export abstract class DrawSystem {
  ctx: WGPUContext | undefined;
  lastTS : number = 0;
  deltaTS : number = 0;

  constructor(public canvas: HTMLCanvasElement) {
    this.Run();
  }

  abstract Initialize(): Promise<boolean>;
  abstract Update(): void;
  abstract Draw(): void;

  private async Run() {
    this.ctx = await initWebGPU(this.canvas);

    if (!this.ctx.device) {
      throw new Error("WebGPU Context Init Failed");
    }

    if (!(await this.Initialize())) {
      throw new Error("Data Init Failed");
    }

    function myAnimationLoop(timestamp: number, native: DrawSystem) {

      native.deltaTS = timestamp - native.lastTS;
      native.Update();
      native.Draw();
      native.lastTS = timestamp;

      // Call requestAnimationFrame to loop the animation
      requestAnimationFrame((timestamp) => myAnimationLoop(timestamp, native));
    }

    myAnimationLoop(this.lastTS, this);
  }
}
