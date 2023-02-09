import { useState, useEffect, useRef } from "react";
import { GetBGColor, GetRenderMode, HexToRgb, RGBToHex, Run, SetBGColor, SwitchRenderMode } from "./DrawCube";
// import workerUrl from "./DrawCube.ts?url";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const [btnText, SetBtnText] = useState("Null")

  useEffect(() => {
    if (!canvasRef.current || !colorPickerRef.current) {
      return;
    }

    (() => {
      colorPickerRef.current.value = RGBToHex(GetBGColor());
    })();

    Run(canvasRef.current);

    SetBtnText(GetRenderMode());
    
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        width="800"
        height="600"
        style={{ color: "violet", border: "solid" }}
      ></canvas>
      <br />
      <input ref={colorPickerRef} type={"color"} onChange={(ev)=>{ SetBGColor(HexToRgb(ev.target.value)); }}></input> Back Ground Color
      <br/>
      <button onClick={(ev)=>{SwitchRenderMode(); SetBtnText(GetRenderMode());}}>{btnText}</button>
    </>
  );
}
