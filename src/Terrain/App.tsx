import { useState, useEffect, useRef } from "react";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }


  },[]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width="640"
        height="480"
        style={{ color: "violet", border: "solid" }}
      ></canvas>
    </>
  );
}
