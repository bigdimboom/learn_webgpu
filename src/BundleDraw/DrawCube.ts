import { initWebGPU, WGPUContext } from "../utils/WgpuContext";
import { glMatrix, mat4, vec3, vec4 } from "gl-matrix";
import shaderSource from "./Shader.wgsl?raw";

import { PrimitiveMode, UnitCube } from "../utils/Primitives";
import { FreeLookCam } from "../utils/FreeLookCam";
import { UserInput } from "../utils/UserInput";
import { BindFreeLookCamWithInput } from "../utils/Common";

interface RenderData {
  ubo: GPUBuffer;
  rBundleFilled: GPURenderBundle;
  rBundleWireframe: GPURenderBundle;
  depthTarget: GPUTexture;
  mvp?: mat4;
  modelview?: mat4;
}

const MatrixSize = mat4.create().length * 4;
const BGColor = [0.2, 0.3, 0.5, 1.0];
let IsWireFrame = false;

async function initData(ctx: WGPUContext): Promise<RenderData> {
  // cube data
  const cubeFilled = new UnitCube(1, PrimitiveMode.Fill);
  cubeFilled.ComputeVBO(ctx.device);
  cubeFilled.ComputeIBO(ctx.device);

  const cubeWireframe = new UnitCube(1, PrimitiveMode.WireFrame);
  cubeWireframe.ComputeVBO(ctx.device);
  cubeWireframe.ComputeIBO(ctx.device);

  // allocate ubo
  const ubo = ctx.device.createBuffer({
    //size: UBO_OFFSET * 2, // MVP, modelview
    size: MatrixSize * 2, // MVP, modelview
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label: "UBO for MVP",
  });

  const width = ctx.canvasCtx.canvas.width;
  const height = ctx.canvasCtx.canvas.height;
  const depthTarget = ctx.device.createTexture({
    format: "depth24plus",
    size: [width, height],
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
    label: "depth texture",
  });

  const SetupBundle = async (topology: GPUPrimitiveTopology, cube: UnitCube) =>  
  {
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
        topology: topology,
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

    const bundleEncoder = ctx.device.createRenderBundleEncoder({
      colorFormats: [ctx.format],
      depthStencilFormat: "depth24plus",
      label: "filled cube draw bundle"
    });

    if(!cube.ibo || !cube.vbo) throw new Error("Bad Data");

    bundleEncoder.setPipeline(pipeline);
    bundleEncoder.setVertexBuffer(0, cube.vbo, 0,cube.vertices.byteLength);
    bundleEncoder.setVertexBuffer(1,cube.vbo, cube.vertices.byteLength, cube.normals.byteLength);
    bundleEncoder.setIndexBuffer(cube.ibo, "uint16");
    bundleEncoder.setBindGroup(0, bindGroup);
    bundleEncoder.drawIndexed(cube.indices.length);
    return bundleEncoder.finish();
  };

  const rBundle1 = await SetupBundle("triangle-list", cubeFilled);
  const rBundle2 = await SetupBundle("line-list", cubeWireframe);

  return {
    ubo,
    rBundleFilled : rBundle1,
    rBundleWireframe: rBundle2,
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
        clearValue: BGColor,
      },
    ],
    depthStencilAttachment: {
      view: data.depthTarget.createView(),
      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    },
  });

  if(IsWireFrame)
  {
    renderPass.executeBundles([data.rBundleWireframe]);
  }
  else
  {
    renderPass.executeBundles([data.rBundleFilled]);
  }
  
  renderPass.end();

  // renderPass.setPipeline(data.pipeline);
  // renderPass.setVertexBuffer(
  //   0,
  //   data.cube.GetVBO(),
  //   0,
  //   data.cube.vertices.byteLength
  // );
  // renderPass.setVertexBuffer(
  //   1,
  //   data.cube.GetVBO(),
  //   data.cube.vertices.byteLength,
  //   data.cube.normals.byteLength
  // );
  // renderPass.setIndexBuffer(data.cube.GetIBO(), "uint16");
  // renderPass.setBindGroup(0, data.bindGroup);
  // renderPass.drawIndexed(data.cube.indices.length);
  // renderPass.end();

  ctx.device.queue.submit([encoder.finish()]);
}

export async function Run(canvas: HTMLCanvasElement) {
  const ctx = await initWebGPU(canvas);
  const rData = await initData(ctx);

  if (!ctx.size) {
    throw new Error("must use canvas size");
  }

  const input = new UserInput();

  const aspectR = ctx.canvasCtx.getCurrentTexture().width / ctx.canvasCtx.getCurrentTexture().height;
  const camera = new FreeLookCam(glMatrix.toRadian(60), aspectR);
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

export function SetBGColor(color: RGB)
{
  BGColor[0] = color.r / 255.0;
  BGColor[1] = color.g / 255.0;
  BGColor[2] = color.b / 255.0;
  BGColor[3] = 1.0;
}

export interface RGB
{
  r: number;
  g: number;
  b: number;
}

export function HexToRgb(hex : string) : RGB
{
  if(hex[0] === '#')
  {
    hex = hex.substring(1);
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return { r: r, g: g, b: b };
}

export function RGBToHex(input : RGB) : string {
  var hexR = input.r.toString(16).padStart(2, "0");
  var hexG = input.g.toString(16).padStart(2, "0");
  var hexB = input.b.toString(16).padStart(2, "0");

  return "#" + hexR + hexG + hexB;
}

export function GetBGColor() : RGB
{
  const r = Math.round(BGColor[0] * 255);
  const g = Math.round(BGColor[1] * 255);
  const b = Math.round(BGColor[2] * 255);

  return {r,g,b};
}

export function SwitchRenderMode()
{
  IsWireFrame = !IsWireFrame;
}

export function GetRenderMode() : string
{
  return !IsWireFrame? "To Wireframe Mode" : "To Filled Mode"
}