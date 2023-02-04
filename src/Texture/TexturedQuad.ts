import { initWebGPU, WGPUContext } from "../utils/WgpuContext";
import shaderSource from "./QuadShader.wgsl?raw";

import textureUrl from "../assets/texture.png?url";
import workerUrl from "./TextureLoader.ts?url";

interface RenderData {
  vbo: GPUBuffer;
  ibo: GPUBuffer;
  nVerts: number;
  pipeline: GPURenderPipeline;
  bindGroup: GPUBindGroup;
}

async function initData(ctx: WGPUContext, bitmap: ImageBitmap): Promise<RenderData> {
  // vertex
  const pos_uvs = new Float32Array(
    [
      // x, y,    u, v
      [-0.5, 0.5, 0, 0],
      [-0.5, -0.5, 0, 1],
      [0.5, -0.5, 1, 1],
      [0.5, 0.5, 1, 0],
    ].flat()
  );
  const vbo = ctx.device.createBuffer({
    size: pos_uvs.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    label: "quad vbo",
  });

  // indices
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  const ibo = ctx.device.createBuffer({
    size: indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    label: "quad ibo",
  });

  // texture
  const texture = ctx.device.createTexture({
    format: "rgba8unorm",
    size: [bitmap.width, bitmap.height, 1],
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  const sampler = ctx.device.createSampler({
    label: "texture sampler",
  });

  // upload data
  ctx.device.queue.writeBuffer(vbo, 0, pos_uvs);
  ctx.device.queue.writeBuffer(ibo, 0, indices);
  ctx.device.queue.copyExternalImageToTexture(
    { source: bitmap },
    { texture: texture },
    [bitmap.width, bitmap.height, 1]
  );

  /*
  // pipeline layout example
  const pipelineLayout = ctx.device.createPipelineLayout({
    bindGroupLayouts:[
      ctx.device.createBindGroupLayout({
        entries:[
          {binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler:{}},
          {binding: 1, visibility: GPUShaderStage.FRAGMENT, texture:{}},
        ],
        label: "bind group layout"
      })
    ]
  });
  */

  const pipeline = await ctx.device.createRenderPipelineAsync({
    layout: "auto",
    vertex: {
      entryPoint: "vs_main",
      module: ctx.device.createShaderModule({
        code: shaderSource,
        label: "vertex shader",
      }),
      buffers: [
        {
          arrayStride: 4 * 4,
          attributes: [
            { format: "float32x2", offset: 0, shaderLocation: 0 }, // xy
            { format: "float32x2", offset: 2 * 4, shaderLocation: 1 }, //uv
          ],
          stepMode: "vertex",
        },
      ],
    },
    fragment: {
      entryPoint: "fs_main",
      module: ctx.device.createShaderModule({
        code: shaderSource,
        label: "fragment shader",
      }),
      targets: [{ format: ctx.format }],
    },
    primitive: {
      topology: "triangle-list",
    },
    label: "rendering pipeline",
  });

  const bindGroup = ctx.device.createBindGroup({
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: texture.createView() },
    ],
    layout: pipeline.getBindGroupLayout(0),
  });

  return {
    vbo: vbo,
    ibo: ibo,
    nVerts: indices.length,
    pipeline: pipeline,
    bindGroup: bindGroup,
  };
}

async function draw(ctx: WGPUContext, data: RenderData) {
  const encoder = ctx.device.createCommandEncoder({
    label: "command encoder",
  });

  const view = ctx.canvasCtx.getCurrentTexture().createView();
  const renderPass = encoder.beginRenderPass({
    colorAttachments: [
      {
        loadOp: "clear",
        storeOp: "store",
        view: view,
        clearValue: [0.2, 0.3, 0.8, 1],
      },
    ],
    label: "render pass start",
  });

  renderPass.setPipeline(data.pipeline);

  renderPass.setBindGroup(0, data.bindGroup);
  renderPass.setVertexBuffer(0, data.vbo);
  renderPass.setIndexBuffer(data.ibo, "uint16");

  renderPass.drawIndexed(data.nVerts);
  renderPass.end();
  ctx.device.queue.submit([encoder.finish()]);
}

export async function Run(canvas: HTMLCanvasElement) {

  const ctx = await initWebGPU(canvas);
  let renderData: RenderData;

  const worker = new Worker(workerUrl, { type: 'module' });
  worker.postMessage({ texPath : textureUrl});
  worker.onmessage = ({ data }) => {
    console.log("main thread: ", data.status);
    if(data.status)
    {
      (async ()=>{
        renderData = await initData(ctx, data.bitmap);
        requestAnimationFrame(render);
      })();
    }
  };

  async function render() {
    draw(ctx, renderData);
    requestAnimationFrame(render);
  }
}

Run(document.getElementById("main_canvas") as HTMLCanvasElement);
