import { BindFreeLookCamWithInput } from "../utils/Common";
import { FreeLookCam } from "../utils/FreeLookCam";
import { UserInput } from "../utils/UserInput";
import { initWebGPU, WGPUContext } from "../utils/WgpuContext";
import { DrawUtil } from "./DrawUtil";

export abstract class DrawSystem {
  ctx: WGPUContext | undefined;
  lastTS : number = 0;
  deltaTS : number = 0;
  input : UserInput;
  camera: FreeLookCam;
  drawUtil : DrawUtil | undefined;

  constructor(public canvas: HTMLCanvasElement) {
    this.input = new UserInput();
    this.camera = new FreeLookCam();
    BindFreeLookCamWithInput(this.camera, this.input, canvas);
    this.Run();
  }

  abstract Initialize(): Promise<boolean>;
  abstract Update(): void;
  abstract Draw(): void;

  private async Run() {
    this.ctx = await initWebGPU(this.canvas);
    this.drawUtil = new DrawUtil(this.ctx);

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
