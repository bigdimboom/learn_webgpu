import { useState, useEffect, useRef } from "react";
import { Drawer } from "./Drawer";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);


  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const hhh = new Drawer(canvasRef.current);
    
  },[]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width="512"
        height="512"
        style={{ color: "violet", border: "solid" }}
      ></canvas>
    </>
  );
}
