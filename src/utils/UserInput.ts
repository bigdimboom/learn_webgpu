export interface OnMouseEvent {
  lastCoord: [X: number, Y: number];
  currCoord: [X: number, Y: number];
  delta: [X: number, Y: number];
  hasBtnDown: boolean;
  event?: MouseEvent;
}

interface MouseStates {
  onMouseEv : OnMouseEvent, // my custom event
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
        hasBtnDown : false
      },

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
    OnBtnDownCallback?: ((ev: OnMouseEvent) => void) | undefined,
    OnBtnReleaseCallback?: ((ev: OnMouseEvent) => void) | undefined,
    OnMouseMove?: ((ev: OnMouseEvent) => void) | undefined
  ) {
    window.addEventListener("mousedown", (downEvent: MouseEvent) => {
      this.mouse.onMouseEv.hasBtnDown = true;
      this.mouse.Update(downEvent);
      
      if (OnBtnDownCallback !== undefined) {
        OnBtnDownCallback(this.mouse.onMouseEv);
      }
    });

    window.addEventListener("mouseup", (upEvent: MouseEvent) => {
      this.mouse.onMouseEv.hasBtnDown = false;
      this.mouse.Update(upEvent);

      if (OnBtnReleaseCallback !== undefined) {
        OnBtnReleaseCallback(this.mouse.onMouseEv);
      }
    });

    window.addEventListener("mousemove", (moveEvent: MouseEvent) => {
      this.mouse.Update(moveEvent);

      if (OnMouseMove !== undefined) {
        OnMouseMove(this.mouse.onMouseEv);
      }
    });
  }
}
