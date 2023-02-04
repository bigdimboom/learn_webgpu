import { useState, useEffect, useRef } from "react";
import reactLogo from "./assets/react.svg";
import "./App.css";

import textureUrl from "./assets/texture.png?url";

function App() {
  const [count, setCount] = useState(0);

  const [gpuAvailable, setGPUAvailable] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);

  const loadImage = async () => {
    // fetch an image and upload to GPUTexture
    //const res = await fetch(textureUrl);
    // const img = await res.blob()
    const img = imageRef.current;
    if(!img) return;

    img.src = textureUrl;
    await img.decode();
  }

  useEffect(() => {
    if (navigator.gpu) {
      navigator.gpu.requestAdapter().then((adapter) => {
        if (adapter) {
          setGPUAvailable(true);
        }
      });
    }

    // loadImage();

  }, []);

  return (
    <div className="App">
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <div>WebGPU: {gpuAvailable ? "available" : "not available"}</div>;
      {/* <img ref={imageRef}></img> */}
    </div>
  );
}

export default App;
