import { initWebGPU, WGPUContext } from "../utils/WgpuContext";
import { glMatrix, mat4, vec3, vec4 } from "gl-matrix";
import shaderSource from "./Shader.wgsl?raw";

import { UnitCube } from "../utils/Primitives";
import { FreeLookCam } from "../utils/FreeLookCam";
import { UserInput } from "../utils/UserInput";
import { BindFreeLookCamWithInput } from "../utils/Common";

interface RenderData {
  cube: UnitCube;
  ubo: GPUBuffer;
  pipeline: GPURenderPipeline;
  bindGroup: GPUBindGroup;
  depthTarget: GPUTexture;
  mvp?: mat4;
  modelview?: mat4;
}

const MatrixSize = mat4.create().length * 4;

async function initData(ctx: WGPUContext): Promise<RenderData> {
  // cube data
  const cube = new UnitCube(1);
  cube.ComputeVBO(ctx.device);
  cube.ComputeIBO(ctx.device);

  // allocate ubo
  const ubo = ctx.device.createBuffer({
    //size: UBO_OFFSET * 2, // MVP, modelview
    size: MatrixSize * 2, // MVP, modelview
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label: "UBO for MVP",
  });

  const pipeline = await ctx.device.createRenderPipelineAsync({
    layout: "auto",
    vertex: {
      entryPoint: "vs_main",
      module: ctx.device.createShaderModule({
        code: shaderSource,
        label: "vertex shader module",
      }),
      buffers: [
        {
          arrayStride: 4 * 3,
          attributes: [{ format: "float32x3", offset: 0, shaderLocation: 0 }],
        }, // Position
        {
          arrayStride: 4 * 3,
          attributes: [{ format: "float32x3", offset: 0, shaderLocation: 1 }],
        }, // Normals
      ],
    },
    fragment: {
      entryPoint: "fs_main",
      module: ctx.device.createShaderModule({
        code: shaderSource,
        label: "fragment shader module",
      }),
      targets: [{ format: ctx.format }],
    },
    depthStencil: {
      format: "depth24plus",
      depthCompare: "less",
    },
    primitive: {
      topology: "triangle-list",
      cullMode: "back",
      frontFace: "ccw",
    },
    label: "render pipeline",
  });

  const bindGroup = ctx.device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: ubo,
          label: "mvp matrix",
        },
      },
    ],
    label: "bindGroup",
  });

  const width = ctx.canvasCtx.canvas.width;
  const height = ctx.canvasCtx.canvas.height;
  const depthTarget = ctx.device.createTexture({
    format: "depth24plus",
    size: [width, height],
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
    label: "depth texture",
  });

  return {
    cube,
    ubo,
    pipeline,
    bindGroup,
    depthTarget,
  };
}

async function draw(ctx: WGPUContext, data: RenderData) {
  //console.log("rendering...");

  if (data.mvp && data.modelview) {
    ctx.device.queue.writeBuffer(data.ubo, 0, data.mvp as Float32Array);
    ctx.device.queue.writeBuffer(
      data.ubo,
      MatrixSize,
      data.modelview as Float32Array
    );
  }

  const encoder = ctx.device.createCommandEncoder({ label: "cmd encoder" });
  const renderPass = encoder.beginRenderPass({
    colorAttachments: [
      {
        loadOp: "clear",
        storeOp: "store",
        view: ctx.canvasCtx.getCurrentTexture().createView(),
        clearValue: [0.2, 0.3, 0.5, 1.0],
      },
    ],
    depthStencilAttachment: {
      view: data.depthTarget.createView(),
      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    },
  });

  if(!data.cube.vbo || !data.cube.ibo) 
    throw new Error("vbo and/or ibo null");

  renderPass.setPipeline(data.pipeline);
  renderPass.setVertexBuffer(
    0,
    data.cube.vbo,
    0,
    data.cube.vertices.byteLength
  );
  renderPass.setVertexBuffer(
    1,
    data.cube.vbo,
    data.cube.vertices.byteLength,
    data.cube.normals.byteLength
  );
  renderPass.setIndexBuffer(data.cube.ibo, "uint16");
  renderPass.setBindGroup(0, data.bindGroup);
  renderPass.drawIndexed(data.cube.indices.length);
  renderPass.end();

  ctx.device.queue.submit([encoder.finish()]);
}

export async function Run(canvas: HTMLCanvasElement) {
  const ctx = await initWebGPU(canvas);
  const rData = await initData(ctx);

  if (!ctx.size) {
    throw new Error("must use canvas size");
  }

  const input = new UserInput();
  const camera = new FreeLookCam();
  BindFreeLookCamWithInput(camera, input, canvas);

  camera.FromLookAt(vec3.fromValues(0, 2, 5), vec3.fromValues(0, 0, 0));

  const model = mat4.identity(mat4.create());
  rData.mvp = mat4.create();
  rData.modelview = mat4.create();

  function render() {
    if (!rData.mvp || !rData.modelview) return;

    mat4.rotateY(model, model, glMatrix.toRadian(1));
    mat4.mul(rData.modelview, camera.view, model);
    mat4.mul(rData.mvp, camera.proj, rData.modelview);

    draw(ctx, rData);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

Run(document.getElementById("main_canvas") as HTMLCanvasElement);
