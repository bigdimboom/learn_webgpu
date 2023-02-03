// import { useState, useEffect, useRef, useMemo } from "react";
// import reactLogo from "./assets/react.svg";

import shaderSource from "./BasicShader.wgsl?raw";

interface Size {
  width: number;
  height: number;
}

interface Context {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  size?: Size;
}

// initialize webgpu device & config canvas context
async function initWebGPU(canvas: HTMLCanvasElement): Promise<Context> {
  if (!navigator.gpu) throw new Error("Not Support WebGPU");

  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance",
    // powerPreference: 'low-power'
  });

  if (!adapter) throw new Error("No Adapter Found");
  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const size = { width: canvas.width, height: canvas.height };
  context.configure({
    // json specific format when key and value are the same
    device,
    format,
    // prevent chrome warning
    alphaMode: "opaque",
  });
  return { device, context, format, size };
}

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
    draw(ctx.device, ctx.context, pipeline);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

Run(document.getElementById("main_canvas") as HTMLCanvasElement);
