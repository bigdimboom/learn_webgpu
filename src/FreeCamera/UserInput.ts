export interface OnMouseEvent {
  lastCoord: [X: number, Y: number];
  currCoord: [X: number, Y: number];
  delta: [X: number, Y: number];
  event?: MouseEvent;
}

interface MouseStates {
  onMouseEv : OnMouseEvent, // my custom event
  isBtnDown: boolean;
  Update: (builtinMouseEvent: MouseEvent) => void;
}

export class UserInput {
  mouse: MouseStates;

  constructor() {
    this.mouse = {

      onMouseEv : 
      {
        lastCoord: [0, 0],
        currCoord: [0, 0],
        delta: [0, 0],
      },

      isBtnDown: false,

      Update: (ev: MouseEvent) => {
        this.mouse.onMouseEv.lastCoord[0] = this.mouse.onMouseEv.currCoord[0];
        this.mouse.onMouseEv.lastCoord[1] = this.mouse.onMouseEv.currCoord[1];

        this.mouse.onMouseEv.currCoord[0] = ev.clientX;
        this.mouse.onMouseEv.currCoord[1] = ev.clientY;

        this.mouse.onMouseEv.delta[0] = this.mouse.onMouseEv.currCoord[0] - this.mouse.onMouseEv.lastCoord[0];
        this.mouse.onMouseEv.delta[1] = this.mouse.onMouseEv.currCoord[1] - this.mouse.onMouseEv.lastCoord[1];

        this.mouse.onMouseEv.event = ev;
      },
    };
  }

  RegisterOnKeyPressEvent(
    callback: (event: KeyboardEvent, args?: any[]) => void,
    userArgs?: any[]
  ) {
    window.addEventListener("keypress", (event: KeyboardEvent) => {
      // // your event handling code here
      callback(event, userArgs);
    });
  }

  RegisterMouseEvents(
    MouseBtnDownCallback: (ev: OnMouseEvent) => void,
    MouseBtnReleaseCallback?: (ev: OnMouseEvent) => void
  ) {
    window.addEventListener("mousedown", (downEvent: MouseEvent) => {
      this.mouse.isBtnDown = true;
      this.mouse.Update(downEvent);
    });

    window.addEventListener("mouseup", (upEvent: MouseEvent) => {
      this.mouse.isBtnDown = false;
      this.mouse.Update(upEvent);

      if (MouseBtnReleaseCallback !== undefined) {
        MouseBtnReleaseCallback(this.mouse.onMouseEv);
      }
    });

    window.addEventListener("mousemove", (moveEvent: MouseEvent) => {
      this.mouse.Update(moveEvent);

      if (this.mouse.isBtnDown && MouseBtnDownCallback !== undefined) {
        MouseBtnDownCallback(this.mouse.onMouseEv);
      }
    });
  }
}
