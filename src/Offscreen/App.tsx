import { useState, useEffect, useRef } from "react";
import { Run } from "./Draw";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    Run(canvasRef.current);
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        width="800"
        height="600"
        style={{ color: "violet", border: "solid" }}
      ></canvas>
    </>
  );
}
