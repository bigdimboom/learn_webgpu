import { initWebGPU, WGPUContext } from "../utils/WgpuContext";
import { glMatrix, mat4, quat, vec3, vec4 } from "gl-matrix";
import shaderSource from "./Shader.wgsl?raw";

import { UnitCube } from "../utils/Primitives";
import { FreeLookCam } from "../utils/FreeLookCam";
import { UserInput } from "../utils/UserInput";
import { BindFreeLookCamWithInput } from "../utils/Common";

interface RenderData {
  cube: UnitCube;
  cam: FreeLookCam;
  ubo: GPUBuffer;
  pipeline: GPURenderPipeline;
  bindGroup: GPUBindGroup;
  depthTarget: GPUTexture;
  perInstanceData?: Float32Array
}

const MatrixLengthBytes = (mat4.create() as Float32Array).byteLength;
const MatrixLength = mat4.create().length;
const NUM_OF_INSTANCES = 99999;
const CUBE_SPAWN_RANGE = 15;

function EnsureSize(adapter: GPUAdapter, input: number): number {
  const offset = adapter.limits.minUniformBufferOffsetAlignment;
  return Math.ceil(input / offset) * offset;
}

async function initData(ctx: WGPUContext) : Promise<RenderData>
{
  // cube data
  const cube = new UnitCube(0.1);
  cube.ComputeVBO(ctx.device);
  cube.ComputeIBO(ctx.device);

  const cam = new FreeLookCam();
  cam.FromLookAt(vec3.fromValues(0, 2, 5), vec3.fromValues(0, 0, 0));

  const ubo = ctx.device.createBuffer({
    size: EnsureSize(ctx.adapter, cam.GetBytes()) + MatrixLengthBytes * NUM_OF_INSTANCES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
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
      depthWriteEnabled: true // this must enable!!!!!
    },
    primitive: {
      topology: "triangle-list",
      cullMode: "back",
      frontFace: "ccw",
    },
    label: "render pipeline",
  });

  const SIZE = EnsureSize(ctx.adapter, cam.GetBytes());
  const bindGroup = ctx.device.createBindGroup({
    label: "creating bind group",
    layout : pipeline.getBindGroupLayout(0),
    entries : [
        {binding: 0, resource: { label: "camera", buffer: ubo, offset: 0, size: SIZE}},
        {binding: 1, resource: { label: "instances", buffer: ubo, offset: SIZE}},
    ]
  });

  const rez = [ctx.canvasCtx.getCurrentTexture().width, ctx.canvasCtx.getCurrentTexture().height];
  const depthTarget = ctx.device.createTexture({
    format: "depth24plus",
    size: rez,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
    label: "depth texture"
  });

  return {
    cube,
    cam,
    ubo,
    pipeline,
    bindGroup,
    depthTarget
  };
}

async function draw(ctx: WGPUContext, data: RenderData) 
{
    ctx.device.queue.writeBuffer(data.ubo, 0, data.cam.view as Float32Array);
    ctx.device.queue.writeBuffer(data.ubo, MatrixLengthBytes, data.cam.proj as Float32Array);

    const OFFSET = EnsureSize(ctx.adapter, data.cam.GetBytes());
    if(data.perInstanceData)
    {   
        const t = vec3.create();
        const R = quat.create();
        const T = mat4.create();

        for(let i = 0; i < NUM_OF_INSTANCES; ++i)
        {
            const m = data.perInstanceData.slice(i * MatrixLength, (i + 1) * MatrixLength) as mat4;
            mat4.getTranslation(t, m);
            mat4.getRotation(R, m);
            mat4.fromQuat(m, R);
            
            const num = Math.random();
            if(num < 0.5)
            {
                mat4.rotateY(m, m, glMatrix.toRadian(Math.random() * 20));
            }
            else
            {
                mat4.rotateX(m, m, glMatrix.toRadian(Math.random() * 30));
            }

            mat4.mul(m, mat4.fromTranslation(T, t), m);

            data.perInstanceData.set(m, i * MatrixLength);
        }
        ctx.device.queue.writeBuffer(data.ubo, OFFSET, data.perInstanceData);
    }

    const encoder = ctx.device.createCommandEncoder({label: 'encoder'});
    const renderPass = encoder.beginRenderPass({
        colorAttachments: [
            {
                loadOp: "clear",
                storeOp: "store",
                view: ctx.canvasCtx.getCurrentTexture().createView(),
                clearValue: [0.2, 0.3, 0.5, 1.0],
            },
        ],
        depthStencilAttachment:{
            view: data.depthTarget.createView(),
            depthClearValue : 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store"
        }
    });

    renderPass.setPipeline(data.pipeline);
    renderPass.setVertexBuffer(0, data.cube.GetVBO(), 0, data.cube.vertices.byteLength);
    renderPass.setVertexBuffer(1, data.cube.GetVBO(), data.cube.vertices.byteLength, data.cube.normals.byteLength);
    renderPass.setIndexBuffer(data.cube.GetIBO(), "uint16");
    renderPass.setBindGroup(0, data.bindGroup);
    renderPass.drawIndexed(data.cube.indices.length, NUM_OF_INSTANCES);
    renderPass.end();

    ctx.device.queue.submit([encoder.finish()]);
    //console.log("rendering...");
}

export async function Run(canvas: HTMLCanvasElement) {
  const ctx = await initWebGPU(canvas);
  const rData = await initData(ctx);

  if (!ctx.size) {
    throw new Error("must use canvas size");
  }

  const input = new UserInput();
  BindFreeLookCamWithInput(rData.cam, input, canvas);

  rData.perInstanceData = new Float32Array(NUM_OF_INSTANCES * MatrixLength);
  for(let i = 0; i < NUM_OF_INSTANCES; ++i)
  {
     const init = mat4.identity(mat4.create());
     const T = vec3.fromValues(Math.random() * CUBE_SPAWN_RANGE, Math.random() * CUBE_SPAWN_RANGE, Math.random() * CUBE_SPAWN_RANGE);
     mat4.translate(init, init, T);
     rData.perInstanceData.set(init, i * MatrixLength);
  }

  function render() 
  {
    draw(ctx, rData);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

Run(document.getElementById("main_canvas") as HTMLCanvasElement);
