import { useState, useEffect, useRef } from "react";
import { Drawer } from "./Drawer";
import testUrl from "../assets/test.mp4?url";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  //https://media.w3.org/2010/05/sintel/trailer_hd.mp4'

  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) {
      return;
    }

    const sss = new Drawer(canvasRef.current, videoRef.current);
    
  },[]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width="640"
        height="320"
        style={{ color: "violet", border: "solid" }}
      ></canvas>
      <video src={testUrl} ref={videoRef} autoPlay muted controls loop hidden></video>
    </>
  );
}
