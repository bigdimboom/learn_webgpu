import { glMatrix, vec2, vec3, mat3, vec4, mat4 } from "gl-matrix";

export interface Vertex {
  position: vec3;
  normal: vec3;
  uv: vec2;
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
  VERTEX_SIZE = (3 + 3 + 2) * 4,
}

export class Geometry {
  vertices: Float32Array;
  indices: Uint16Array;

  mvp: MVP = {
    modelView: mat4.create(),
    modelViewInv: mat4.create(),
    proj: mat4.create(),
    projInv: mat4.create(),
  };

  vbo: GPUBuffer | null = null;
  ibo: GPUBuffer | null = null;
  ubo: GPUBuffer | null = null;

  uboOffset: number = 0;

  constructor() {
    this.vertices = new Float32Array();
    this.indices = new Uint16Array();
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

  UpdateTransform(device: GPUDevice, modelView: mat4, proj: mat4) {
    if (!this.ubo) throw new Error("UBO undefined");

    this.mvp.modelView = modelView;
    mat4.invert(this.mvp.modelViewInv, this.mvp.modelView);
    this.mvp.proj = proj;
    mat4.invert(this.mvp.projInv, this.mvp.proj);

    let dataOffset = this.uboOffset;
    device.queue.writeBuffer(
      this.ubo,
      dataOffset,
      this.mvp.modelView as Float32Array
    );

    dataOffset += GeomConstant.MAT4_SIZE;
    device.queue.writeBuffer(
      this.ubo,
      dataOffset,
      this.mvp.proj as Float32Array
    );

    dataOffset += GeomConstant.MAT4_SIZE;
    device.queue.writeBuffer(
      this.ubo,
      dataOffset,
      this.mvp.modelViewInv as Float32Array
    );

    dataOffset += GeomConstant.MAT4_SIZE;
    device.queue.writeBuffer(
      this.ubo,
      dataOffset,
      this.mvp.projInv as Float32Array
    );
  }

  static VerticesToFloat32Array(vertices: Vertex[]): Float32Array {
    const floats: number[] = [];

    vertices.forEach((vertex) => {
      floats.push(...vertex.position);
      floats.push(...vertex.normal);
      floats.push(...vertex.uv);
    });

    return new Float32Array(floats);
  }
}

export class UnitBox extends Geometry {
  constructor(scale: number = 1) {
    super();
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
  }
}

export class Sphere extends Geometry {
  constructor(radius: number, center: vec3, slices: number, stacks: number) {
    super();

    const data = Sphere.generateSphere(radius, center, slices, stacks);
    this.vertices = Geometry.VerticesToFloat32Array(data.vertices);
    this.indices = new Uint16Array(data.indices);
  }

  static generateSphere(
    radius: number,
    center: vec3,
    slices: number,
    stacks: number
  ): { vertices: Vertex[]; indices: number[] } {

    // Generated by ChatGPT
    const pi = Math.PI;

    const vertices: Vertex[] = [];
    const indices: number[] = [];

    for (let stack = 0; stack <= stacks; ++stack) {
      const phi = pi * (stack / stacks);
      const y = radius * Math.cos(phi);
      const scale = radius * Math.sin(phi);

      for (let slice = 0; slice <= slices; ++slice) {
        const theta = 2.0 * pi * (slice / slices);
        const x = scale * Math.cos(theta);
        const z = scale * Math.sin(theta);

        const vertex: Vertex = {
          position: vec3.add(vec3.create(), vec3.fromValues(x, y, z), center),
          normal: vec3.normalize(
            vec3.create(),
            vec3.sub(vec3.create(), vec3.fromValues(x, y, z), center)
          ),
          uv: vec2.fromValues(slice / slices, stack / stacks),
        };

        vertices.push(vertex);
      }
    }

    for (let stack = 0; stack < stacks; ++stack) {
      for (let slice = 0; slice < slices; ++slice) {
        const index = stack * (slices + 1) + slice;

        indices.push(index);
        indices.push(index + 1);
        indices.push(index + slices + 2);

        indices.push(index);
        indices.push(index + slices + 2);
        indices.push(index + slices + 1);
      }
    }

    return { vertices, indices };
  }
}
