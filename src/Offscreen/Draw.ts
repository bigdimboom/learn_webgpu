import {
  PrimitiveData,
  RenderBufferData,
  Sphere,
  UnitBox,
  UnitPlane,
} from "../utils/Primitives";
import { initWebGPU, WGPUContext } from "../utils/WgpuContext";
import { RenderPipelineBuilder } from "./RenderPipelineBuilder";
import { vec3, vec4, mat3, mat4, glMatrix } from "gl-matrix";

import ofsShaderSrc from "./OffscreenShader.wgsl?raw";
import mainShaderSrc from "./MainShader.wgsl?raw";

import textureUrl from "../assets/texture.png?url";
import workerUrl from "./TextureLoader.ts?url";
import { UserInput } from "../utils/UserInput";
import { FreeLookCam } from "../utils/FreeLookCam";
import { BindFreeLookCamWithInput } from "../utils/Common";

interface Transform {
  mvp: mat4;
  modelView: mat4;
}

const TransformSize = 4 * 4 * 4 * 2;

interface RenderableData {
  mesh: RenderBufferData;
  ubo: GPUBuffer;
}

interface RenderTarget {
  color: GPUTexture;
  depth: GPUTexture;
}

interface OffScreenRenderData {
  data: Map<string, RenderableData>;
  bindGroups: Map<string, GPUBindGroup>;
  bundles: GPURenderBundle[];
  targets: RenderTarget;
  xforms: Map<string, Transform>;
}

interface MainRenderData {
  plane: UnitPlane;
  ubo: GPUBuffer;
  pipeline: GPURenderPipeline;
  bindGroup: GPUBindGroup;
  depth: GPUTexture;
  xform: Transform;
}

async function InitOffscreenData(ctx: WGPUContext) {
  const data = new Map<string, RenderableData>();
  const xforms = new Map<string, Transform>();
  const bindGroups = new Map<string, GPUBindGroup>();
  const bundles: GPURenderBundle[] = [];

  const uboDesc: GPUBufferDescriptor = {
    size: TransformSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label: "ubo",
  };

  data.set("box", {
    mesh: new UnitBox(),
    ubo: ctx.device.createBuffer(uboDesc),
  });
  data.set("ball", {
    mesh: new Sphere(),
    ubo: ctx.device.createBuffer(uboDesc),
  });
  data.set("plane", {
    mesh: new UnitPlane(),
    ubo: ctx.device.createBuffer(uboDesc),
  });

  const bindGroupLayout = ctx.device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
      },
    ],
    label: "bind group layout",
  });

  data.forEach((val, key, map) => {
    val.mesh.ComputeVBO(ctx.device);
    val.mesh.ComputeIBO(ctx.device);

    bindGroups.set(
      key,
      ctx.device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: { buffer: val.ubo, label: "ubo bind point" },
          },
        ],
        label: "ubo bind group",
      })
    );

    xforms.set(key, {
      modelView: mat4.identity(mat4.create()),
      mvp: mat4.identity(mat4.create())
    });

  });

  const offscreenRenderTarget: RenderTarget = {
    color: ctx.device.createTexture({
      format: ctx.format,
      size: [512, 512],
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    }),
    depth: ctx.device.createTexture({
      format: "depth32float",
      size: [512, 512],
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    }),
  };

  const pipelineBuilder = new RenderPipelineBuilder(
    ctx,
    ofsShaderSrc,
    ofsShaderSrc,
    true
  );

  pipelineBuilder.SetPipelineLayout(
    ctx.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
      label: "pipeline layout",
    })
  );
  pipelineBuilder.SetColorTargetStates([
    {
      format: ctx.format,
    },
  ]);
  pipelineBuilder.SetDepthStencil({
    format: offscreenRenderTarget.depth.format,
    depthWriteEnabled: true,
    depthCompare: "less",
  });

  {
    // box and sphere
    pipelineBuilder.SetVertexBufferLayouts([
      {
        arrayStride: 4 * 3 * 2 + 4 * 2,
        attributes: [
          { format: "float32x3", offset: 0, shaderLocation: 0 },
          { format: "float32x3", offset: 12, shaderLocation: 1 },
          { format: "float32x2", offset: 24, shaderLocation: 2 },
        ],
      },
    ]);

    const bundle = ctx.device.createRenderBundleEncoder({
      colorFormats: [offscreenRenderTarget.color.format],
      depthStencilFormat: offscreenRenderTarget.depth.format,
    });

    bundle.setPipeline(pipelineBuilder.Build());

    bundle.setBindGroup(0, bindGroups.get("box") as GPUBindGroup);
    bundle.setVertexBuffer(0, data.get("box")?.mesh.vbo as GPUBuffer);
    bundle.setIndexBuffer(data.get("box")?.mesh.ibo as GPUBuffer, "uint16");
    bundle.drawIndexed((data.get("box")?.mesh.ibo as GPUBuffer).size / 2);

    bundle.setBindGroup(0, bindGroups.get("ball") as GPUBindGroup);
    bundle.setVertexBuffer(0, data.get("ball")?.mesh.vbo as GPUBuffer);
    bundle.setIndexBuffer(data.get("ball")?.mesh.ibo as GPUBuffer, "uint16");
    bundle.drawIndexed((data.get("ball")?.mesh.ibo as GPUBuffer).size / 2);

    bundles.push(bundle.finish());
  }

  // {
  //   // floor
  //   pipelineBuilder.SetVertexBufferLayouts([
  //     {
  //       arrayStride: 4 * 3,
  //       attributes: [{ format: "float32x3", offset: 0, shaderLocation: 0 }],
  //     },
  //     {
  //       arrayStride: 4 * 3,
  //       attributes: [{ format: "float32x3", offset: 0, shaderLocation: 1 }],
  //     },
  //     {
  //       arrayStride: 4 * 2,
  //       attributes: [{ format: "float32x2", offset: 0, shaderLocation: 2 }],
  //     },
  //   ]);

  //   const bundle = ctx.device.createRenderBundleEncoder({
  //     colorFormats: [offscreenRenderTarget.color.format],
  //     depthStencilFormat: offscreenRenderTarget.depth.format,
  //   });

  //   bundle.setPipeline(pipelineBuilder.Build());
  //   bundle.setBindGroup(0, bindGroups.get("floor") as GPUBindGroup);

  //   const meshData = data.get("floor")?.mesh as unknown as PrimitiveData;
  //   const vbo = data.get("floor")?.mesh.vbo as GPUBuffer;
  //   let offset = 0;
  //   bundle.setVertexBuffer(0, vbo, offset, meshData.vertices.byteLength);
  //   offset += meshData.vertices.byteLength;
  //   bundle.setVertexBuffer(1, vbo, offset, meshData.normals?.byteLength);
  //   offset += (meshData.normals as Float32Array).byteLength;
  //   bundle.setVertexBuffer(2, vbo, offset, meshData.texCoord?.byteLength);

  //   bundle.setIndexBuffer(data.get("floor")?.mesh.ibo as GPUBuffer, "uint16");
  //   bundle.drawIndexed((data.get("floor")?.mesh.ibo as GPUBuffer).size / 2);

  //   bundles.push(bundle.finish());
  // }

  const result: OffScreenRenderData = {
    data: data,
    xforms: xforms,
    bindGroups: bindGroups,
    bundles: bundles,
    targets: offscreenRenderTarget,
  };
  return result;
}

async function InitMainData(ctx: WGPUContext, bitmap: ImageBitmap, ofsData : OffScreenRenderData) {
  const plane = new UnitPlane();
  plane.ComputeVBO(ctx.device);
  plane.ComputeIBO(ctx.device);

  const ubo = ctx.device.createBuffer({
    size: TransformSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // texture
  const sampler = ctx.device.createSampler({
    label: "texture sampler"
  });

  // TODO:
  // const texture = ctx.device.createTexture({
  //   format: "rgba8unorm",
  //   size: [bitmap.width, bitmap.height, 1],
  //   usage:
  //     GPUTextureUsage.TEXTURE_BINDING |
  //     GPUTextureUsage.COPY_DST |
  //     GPUTextureUsage.RENDER_ATTACHMENT,
  // });

  const texture = ofsData.targets.color;

  // ctx.device.queue.copyExternalImageToTexture(
  //   { source: bitmap },
  //   { texture: texture }, // TODO:
  //   [bitmap.width, bitmap.height, 1]
  // );

  const rez = [
    ctx.canvasCtx.getCurrentTexture().width,
    ctx.canvasCtx.getCurrentTexture().height,
  ];
  const depth = ctx.device.createTexture({
    format: "depth24plus",
    size: rez,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
  const pipelineBuilder = new RenderPipelineBuilder(
    ctx,
    mainShaderSrc,
    mainShaderSrc,
    true
  );
  pipelineBuilder.SetVertexBufferLayouts([
    {
      arrayStride: 4 * 3,
      attributes: [{ format: "float32x3", offset: 0, shaderLocation: 0 }],
    },
    {
      arrayStride: 4 * 3,
      attributes: [{ format: "float32x3", offset: 0, shaderLocation: 1 }],
    },
    {
      arrayStride: 4 * 2,
      attributes: [{ format: "float32x2", offset: 0, shaderLocation: 2 }],
    },
  ]);
  pipelineBuilder.SetDepthStencil({
    format: depth.format,
    depthCompare: "less",
    depthWriteEnabled: true,
  });
  pipelineBuilder.primitiveState.cullMode = "none";

  const pipeline = pipelineBuilder.Build();
  const bindGroup = ctx.device.createBindGroup({
    entries: [
      { binding: 0, resource: { buffer: ubo } },
      { binding: 1, resource: sampler },
      { binding: 2, resource: texture.createView() },
    ],
    layout: pipeline.getBindGroupLayout(0),
  });

  const result: MainRenderData = {
    plane,
    ubo,
    pipeline,
    bindGroup,
    depth,
    xform: {
      modelView: mat4.identity(mat4.create()),
      mvp: mat4.identity(mat4.create()),
    },
  };
  return result;
}


function DrawFrame(
  ctx: WGPUContext,
  ofsData: OffScreenRenderData,
  mainData: MainRenderData
) {
  if (mainData.xform) {
    ctx.device.queue.writeBuffer(mainData.ubo,0, mainData.xform.mvp as Float32Array);
    ctx.device.queue.writeBuffer(mainData.ubo,(mainData.xform.mvp as Float32Array).byteLength, mainData.xform.modelView as Float32Array);
  }

  if(ofsData.xforms)
  {
    ofsData.xforms.forEach((val, key, map)=>{
      const ubo = ofsData.data.get(key)?.ubo as GPUBuffer;
      ctx.device.queue.writeBuffer(ubo, 0, val.mvp as Float32Array);
      ctx.device.queue.writeBuffer(ubo, (val.mvp as Float32Array).byteLength, val.modelView as Float32Array);
    });
  }

  const encoder = ctx.device.createCommandEncoder({
    label: "command encoder",
  });
  
  {
    // offscreen renderer
    const colorView = ofsData.targets.color.createView();
    const depthView = ofsData.targets.depth.createView();
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          loadOp: "clear",
          storeOp: "store",
          view: colorView,
          clearValue: [0.3, 0.2, 0.1, 1],
        },
      ],
      depthStencilAttachment: {
        view: depthView,
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
      label: "render pass start",
    });

    renderPass.executeBundles(ofsData.bundles);
    renderPass.end();
  }

  {
    // Main Renderer
    const colorView = ctx.canvasCtx.getCurrentTexture().createView();
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          loadOp: "clear",
          storeOp: "store",
          view: colorView,
          clearValue: [0.2, 0.3, 0.8, 1],
        },
      ],
      depthStencilAttachment: {
        view: mainData.depth.createView(),
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
      label: "render pass start",
    });

    renderPass.setPipeline(mainData.pipeline);
    renderPass.setBindGroup(0, mainData.bindGroup);

    const vbo = mainData.plane.vbo as GPUBuffer;
    const ibo = mainData.plane.ibo as GPUBuffer;

    let offset = 0;
    renderPass.setVertexBuffer(
      0,
      vbo,
      offset,
      mainData.plane.vertices.byteLength
    );
    offset += mainData.plane.vertices.byteLength;
    renderPass.setVertexBuffer(
      1,
      vbo,
      offset,
      mainData.plane.normals?.byteLength
    );
    offset += (mainData.plane.normals as Float32Array).byteLength;
    renderPass.setVertexBuffer(
      2,
      vbo,
      offset,
      mainData.plane.texCoord?.byteLength
    );

    renderPass.setIndexBuffer(ibo, "uint16");
    renderPass.drawIndexed(ibo.size / 2);
    renderPass.end();
  }

  ctx.device.queue.submit([encoder.finish()]);
}

function UpdateMainTransform(cam: FreeLookCam, out: Transform) {
  const model = mat4.identity(mat4.create());
  mat4.rotateX(model, mat4.identity(mat4.create()), glMatrix.toRadian(90));

  mat4.mul(out.modelView, cam.view, model);
  mat4.mul(out.mvp, cam.proj, out.modelView);
}

const Models = new Map<string, mat4>();
function UpdateOffscreenTransform(
  cam: FreeLookCam,
  out: Map<string, Transform>
) {

  out.forEach((val, key, map)=>{

    if(!Models.has(key))
    {
      const model = mat4.identity(mat4.create());
      mat4.translate(model, mat4.identity(mat4.create()), vec3.fromValues(Math.random(), Math.random(), Math.random()));
      Models.set(key, model);
    }
    
    const model = Models.get(key) as mat4;
    const mv = mat4.mul(val.modelView, cam.view, model);
    const mvp = mat4.mul(val.mvp, cam.proj, val.modelView);

    map.set(key, {
      modelView: mv,
      mvp : mvp
    });
  });

}

export async function Run(canvas: HTMLCanvasElement) {
  const ctx = await initWebGPU(canvas);
  let ofsData: OffScreenRenderData;
  let mainData: MainRenderData;

  const input = new UserInput();
  const camera = new FreeLookCam();
  BindFreeLookCamWithInput(camera, input, canvas);

  camera.FromLookAt(vec3.fromValues(0, 2, 5), vec3.fromValues(0, 0, 0));

  const worker = new Worker(workerUrl, { type: "module" });
  worker.postMessage({ texPath: textureUrl });
  worker.onmessage = ({ data }) => {
    console.log("main thread: ", data.status);
    if (data.status) {
      (async () => {
        ofsData = await InitOffscreenData(ctx);
        mainData = await InitMainData(ctx, data.bitmap, ofsData);
        requestAnimationFrame(frame);
      })();
    }
  };

  function frame() {
    UpdateMainTransform(camera, mainData.xform);
    UpdateOffscreenTransform(camera, ofsData.xforms);
    DrawFrame(ctx, ofsData, mainData);
    requestAnimationFrame(frame);
  }
}
