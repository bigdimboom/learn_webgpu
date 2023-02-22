import { glMatrix, vec2, vec3, mat3, vec4, mat4 } from "gl-matrix";

export interface Vertex {
  position: vec3;
  normal: vec3;
  texCoord: vec2;
}

export interface MVP {
  modelView: mat4;
  proj: mat4;
  modelViewInv: mat4;
  projInv: mat4;
}

export enum GeomConstant {
  MVP_SIZE = 16 * 4 * 4,
  MAT4_SIZE = 16 * 4,
  VERTEX_SIZE = (3 + 3 + 2) * 4
}

export class Geometry
{
  vertices: Float32Array;
  indices: Uint16Array;

  mvp: MVP;

  vbo: GPUBuffer | null = null;
  ibo: GPUBuffer | null = null;
  ubo: GPUBuffer | null = null;

  uboOffset: number = 0;

  constructor(scale = 1)
  {
    this.vertices = new Float32Array([
      // float3 position, float3 normal, float2 uv
      scale,scale,scale,    1,0,0,      0,1,
      scale,scale,-scale,   1,0,0,      1,1,
      scale,-scale,scale,   1,0,0,      0,0,
      scale,-scale,-scale,  1,0,0,      1,0,
      -scale,scale,-scale,  -1,0,0,     0,1,
      -scale,scale,scale,   -1,0,0,     1,1,
      -scale,-scale,-scale, -1,0,0,     0,0,
      -scale,-scale,scale,  -1,0,0,     1,0,
      -scale,scale,-scale,  0,1,0,      0,1,
      scale,scale,-scale,   0,1,0,      1,1,
      -scale,scale,scale,   0,1,0,      0,0,
      scale,scale,scale,    0,1,0,      1,0,
      -scale,-scale,scale,  0,-1,0,     0,1,
      scale,-scale,scale,   0,-1,0,     1,1,
      -scale,-scale,-scale, 0,-1,0,     0,0,
      scale,-scale,-scale,  0,-1,0,     1,0,
      -scale,scale,scale,   0,0,1,      0,1,
      scale,scale,scale,    0,0,1,      1,1,
      -scale,-scale,scale,  0,0,1,      0,0,
      scale,-scale,scale,   0,0,1,      1,0,
      scale,scale,-scale,   0,0,-1,     0,1,
      -scale,scale,-scale,  0,0,-1,     1,1,
      scale,-scale,-scale,  0,0,-1,     0,0,
      -scale,-scale,-scale, 0,0,-1,     1,0
    ]);

  this.indices = new Uint16Array([
      0,2,1,
      2,3,1,
      4,6,5,
      6,7,5,
      8,10,9,
      10,11,9,
      12,14,13,
      14,15,13,
      16,18,17,
      18,19,17,
      20,22,21,
      22,23,21
    ]);

    
    this.mvp = {
      modelView : mat4.create(),
      modelViewInv: mat4.create(),
      proj: mat4.create(),
      projInv : mat4.create()
  }
  }


  public GenerateVBO(device: GPUDevice): GPUBuffer {
    const vbo = device.createBuffer({
      size: this.vertices.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
      label: "Vertex Buffer(pos, normal, uv)",
    });

    device.queue.writeBuffer(vbo, 0, this.vertices);
    this.vbo = vbo;
    return vbo;
  }

  public GenerateIBO(device: GPUDevice): GPUBuffer {
    const ibo = device.createBuffer({
      size: this.indices.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX,
      label: "Index Element Buffer",
    });

    device.queue.writeBuffer(ibo, 0, this.indices);

    this.ibo = ibo;
    return ibo;
  }

  GenerateUBO(device: GPUDevice) {
    this.ubo = device.createBuffer({
      size: GeomConstant.MVP_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: "ubo for MVP",
    });
    return this.ubo;
  }

  SetUBO(ubo: GPUBuffer, offset: number) {
    this.ubo = ubo;
    this.uboOffset = offset;
  }

  GetVertexAttributeLayouts(): GPUVertexBufferLayout[] {
    return [
      {
        arrayStride: GeomConstant.VERTEX_SIZE,
        attributes: [
          { format: "float32x3", offset: 0, shaderLocation: 0 },
          { format: "float32x3", offset: 4 * 3, shaderLocation: 1 },
          { format: "float32x2", offset: 4 * 3 + 4 * 3, shaderLocation: 2 },
        ],
      },
    ];
  }

  UpdateTransform(device:GPUDevice, modelView: mat4, proj: mat4)
  {
    if(!this.ubo) throw new Error("UBO undefined");

    this.mvp.modelView = modelView;
    mat4.invert(this.mvp.modelViewInv, this.mvp.modelView);
    this.mvp.proj = proj;
    mat4.invert(this.mvp.projInv, this.mvp.proj);

    let dataOffset = this.uboOffset;
    device.queue.writeBuffer(this.ubo, dataOffset, this.mvp.modelView as Float32Array);
    
    dataOffset += GeomConstant.MAT4_SIZE;
    device.queue.writeBuffer(this.ubo, dataOffset, this.mvp.proj as Float32Array);
    
    dataOffset += GeomConstant.MAT4_SIZE;
    device.queue.writeBuffer(this.ubo, dataOffset, this.mvp.modelViewInv as Float32Array);
    
    dataOffset += GeomConstant.MAT4_SIZE;
    device.queue.writeBuffer(this.ubo, dataOffset, this.mvp.projInv as Float32Array);
  }

  static VerticesToFloat32Array(vertices: Vertex[]): Float32Array {
    const floats: number[] = [];

    vertices.forEach((vertex) => {
      floats.push(...vertex.position);
      floats.push(...vertex.normal);
      floats.push(...vertex.texCoord);
    });

    return new Float32Array(floats);
  }
}

export class UnitBox extends Geometry {}