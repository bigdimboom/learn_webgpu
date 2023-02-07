export interface Size {
  width: number;
  height: number;
}

export interface WGPUContext {
  device: GPUDevice;
  adapter: GPUAdapter;
  canvasCtx: GPUCanvasContext;
  format: GPUTextureFormat;
  size?: Size;
}

// initialize webgpu device & config canvas context
export async function initWebGPU(
  canvas: HTMLCanvasElement
): Promise<WGPUContext> {
  if (!navigator.gpu) throw new Error("Not Support WebGPU");

  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance",
    // powerPreference: 'low-power'
  });

  if (!adapter) throw new Error("No Adapter Found");
  const device = await adapter.requestDevice();
  const canvasCtx = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const size = { width: canvas.width, height: canvas.height };
  canvasCtx.configure({
    // json specific format when key and value are the same
    device,
    format,
    // prevent chrome warning
    alphaMode: "opaque",
  });
  return { device, adapter, canvasCtx, format, size };
}
