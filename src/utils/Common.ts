import { UserInput } from "./UserInput";
import { FreeLookCam } from "./FreeLookCam";
import { glMatrix } from "gl-matrix";

export function BindFreeLookCamWithInput(
  camera: FreeLookCam,
  input: UserInput,
  canvas?: HTMLCanvasElement
) {
  if (input) {
    input.RegisterOnKeyPressEvent((event) => {
      if (!event) throw new Error("event is null");
      //console.log(`Key pressed: ${event.key}`);

      if (event.key === "w") {
        camera.MoveForward(1 * input.deltaTime);
      } else if (event.key === "s") {
        camera.MoveForward(-1 * input.deltaTime);
      } else if (event.key === "a") {
        camera.MoveRight(-1 * input.deltaTime);
      } else if (event.key === "d") {
        camera.MoveRight(1 * input.deltaTime);
      }

      camera.Update();
    });

    if (canvas) {
      canvas.style.cursor = "crosshair";
      const originalCursor = canvas.style.cursor;

      input.RegisterMouseEvents(
        (ev) => {
          canvas.style.cursor = "none";
        },
        (ev) => {
          canvas.style.cursor = originalCursor;
        },
        (ev) => {
          if (ev.hasBtnDown) {
            camera.Yaw(glMatrix.toRadian(-ev.delta[0] * input.deltaTime));
            camera.Pitch(glMatrix.toRadian(-ev.delta[1] * input.deltaTime));
            camera.Update();
          }
        }
      );
    } else {
      input.RegisterMouseEvents(undefined, undefined, (ev) => {
        if (ev.hasBtnDown) {
          camera.Yaw(glMatrix.toRadian(-ev.delta[0] * input.deltaTime));
          camera.Pitch(glMatrix.toRadian(-ev.delta[1] * input.deltaTime));
          camera.Update();
        }
      });
    }
  }
}
