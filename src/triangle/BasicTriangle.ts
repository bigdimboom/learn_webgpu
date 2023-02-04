// import { useState, useEffect, useRef, useMemo } from "react";
// import reactLogo from "./assets/react.svg";

import { initWebGPU } from "../utils/WgpuContext";
import shaderSource from "./BasicShader.wgsl?raw";



// create a simple pipiline
async function initPipeline(
  device: GPUDevice,
  format: GPUTextureFormat
): Promise<GPURenderPipeline> {
  const descriptor: GPURenderPipelineDescriptor = {
    layout: "auto",
    vertex: {
      module: device.createShaderModule({
        code: shaderSource,
      }),
      entryPoint: "vs_main",
    },
    primitive: {
      topology: "triangle-list", // try point-list, line-list, line-strip, triangle-strip?
    },
    fragment: {
      module: device.createShaderModule({
        code: shaderSource,
      }),
      entryPoint: "fs_main",
      targets: [
        {
          format: format,
        },
      ],
    },
  };

  return await device.createRenderPipelineAsync(descriptor);
}

// create & submit device commands
function draw(
  device: GPUDevice,
  context: GPUCanvasContext,
  pipeline: GPURenderPipeline
) {
  const commandEncoder = device.createCommandEncoder();
  const view = context.getCurrentTexture().createView();
  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: view,
        clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
        loadOp: "clear", // clear/load
        storeOp: "store", // store/discard
      },
    ],
  };

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);
  // 3 vertex form a triangle
  passEncoder.draw(3);
  passEncoder.end();
  // webgpu run in a separate process, all the commands will be executed after submit
  device.queue.submit([commandEncoder.finish()]);
}

export async function Run(canvas: HTMLCanvasElement) {
  const ctx = await initWebGPU(canvas);
  const pipeline = await initPipeline(ctx.device, ctx.format);

  function render() {
    draw(ctx.device, ctx.canvasCtx, pipeline);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

Run(document.getElementById("main_canvas") as HTMLCanvasElement);
