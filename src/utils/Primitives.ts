import { initWebGPU } from "./WgpuContext";
import { vec3 } from "gl-matrix";

export enum PrimitiveMode {
  Fill = 0,
  WireFrame,
}

export interface PrimitiveData {
  vertices: Float32Array;
  normals?: Float32Array;
  texCoord?: Float32Array;
  indices?: Uint16Array;
}

export class UnitCube implements PrimitiveData {
  vertices: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;

  vbo: GPUBuffer | null = null;
  ibo: GPUBuffer | null = null;

  public constructor(scale: number = 1.0, kind = PrimitiveMode.Fill) {
    const vertices: vec3[] = [
      // Front face
      vec3.fromValues(-1.0, 1.0, 1.0), // 0
      vec3.fromValues(-1.0, -1.0, 1.0), // 1
      vec3.fromValues(1.0, -1.0, 1.0), // 2
      vec3.fromValues(1.0, 1.0, 1.0), //3

      // Back face
      vec3.fromValues(-1.0, 1.0, -1.0), // 4
      vec3.fromValues(1.0, 1.0, -1.0), // 5
      vec3.fromValues(1.0, -1.0, -1.0), // 6
      vec3.fromValues(-1.0, -1.0, -1.0), // 1
    ];

    let indices: Uint16Array;
    if (kind == PrimitiveMode.Fill) {
      indices = new Uint16Array([
        // Front face
        0,
        1,
        2,
        0,
        2,
        3, //

        // Right face
        3,
        2,
        6,
        3,
        6,
        5, //

        // Back face
        4,
        5,
        6,
        4,
        6,
        7, //

        // Left face
        4,
        7,
        1,
        4,
        1,
        0, //

        // Top face
        4,
        0,
        3,
        4,
        3,
        5, //

        // Bottom face
        7,
        6,
        2,
        7,
        2,
        1, //
      ]);
    } else {
      indices = new Uint16Array([
        // Front face
        0, 1, 1, 2, 2, 3, 3, 0,

        // Back face
        4, 5, 5, 6, 6, 7, 7, 4,

        // the rest
        0, 4, 3, 5, 1, 7, 2, 6,
      ]);
    }

    const tmpNormals = new Array<vec3>(vertices.length);
    for (let i = 0; i < tmpNormals.length; ++i) {
      tmpNormals[i] = vec3.fromValues(0, 0, 0);
    }

    for (let i = 0; i < indices.length; i += 3) {
      const p1 = vertices[indices[i]];
      const p2 = vertices[indices[i + 1]];
      const p3 = vertices[indices[i + 2]];

      const vec1 = vec3.subtract(vec3.create(), p2, p1);
      const vec2 = vec3.subtract(vec3.create(), p3, p2);
      const n = vec3.cross(vec3.create(), vec1, vec2);

      for (let ii = 0; ii < 3; ++ii) {
        //this one sets all values in tmpNormals to zeros
        vec3.add(tmpNormals[indices[i + ii]], tmpNormals[indices[i + ii]], n);

        // unless I do:
        //tmpNormals[indices[i + ii]] = vec3.add(vec3.create(), tmpNormals[indices[i + ii]], n);
      }
    }

    // scale down and assign pos
    vertices.map((val, i, arr) => vec3.scale(arr[i], val, scale));
    this.vertices = new Float32Array(vertices.map((a) => [...a]).flat());
    // normalize and assign normals
    tmpNormals.map((val, i, arr) => vec3.normalize(arr[i], val));
    this.normals = new Float32Array(tmpNormals.map((a) => [...a]).flat());
    // assign indices
    this.indices = indices;
  }

  public ComputeVBO(device: GPUDevice): GPUBuffer {
    const vbo = device.createBuffer({
      size: this.vertices.byteLength + this.normals.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
      label: "Vertex Buffer(pos, normal)",
    });

    device.queue.writeBuffer(vbo, 0, this.vertices);
    device.queue.writeBuffer(vbo, this.vertices.byteLength, this.normals);

    this.vbo = vbo;
    return vbo;
  }

  public ComputeIBO(device: GPUDevice): GPUBuffer {
    const ibo = device.createBuffer({
      size: this.indices.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX,
      label: "Vertex Buffer(pos, normal)",
    });

    device.queue.writeBuffer(ibo, 0, this.indices);

    this.ibo = ibo;
    return ibo;
  }

  public GetVBO(): GPUBuffer {
    if (!this.vbo) {
      throw new Error("vbo is null");
    }
    return this.vbo;
  }

  public GetIBO(): GPUBuffer {
    if (!this.ibo) {
      throw new Error("ibo is null");
    }
    return this.ibo;
  }
}

export class UnitPlane implements PrimitiveData {
  vertices: Float32Array;
  normals: Float32Array;
  texCoord: Float32Array;
  indices: Uint16Array;

  vbo: GPUBuffer | null = null;
  ibo: GPUBuffer | null = null;

  constructor(scale = 1.0, kind = PrimitiveMode.Fill) {
    this.vertices = new Float32Array([
      -scale,
      0,
      -scale,
      -scale,
      0,
      scale,
      scale,
      0,
      scale,
      scale,
      0,
      -scale,
    ]);

    this.texCoord = new Float32Array([0, 0, 0, 1, 1, 1, 1, 0]);

    if (kind === PrimitiveMode.Fill) {
      this.indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    } else {
      this.indices = new Uint16Array([0, 1, 1, 2, 2, 3, 3, 0]);
    }

    this.normals = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);
  }

  public ComputeVBO(device: GPUDevice): GPUBuffer {
    const vbo = device.createBuffer({
      size:
        this.vertices.byteLength +
        this.normals.byteLength +
        this.texCoord.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
      label: "Vertex Buffer(poss, normals, uvs)",
    });

    device.queue.writeBuffer(vbo, 0, this.vertices);
    device.queue.writeBuffer(vbo, this.vertices.byteLength, this.normals);
    device.queue.writeBuffer(
      vbo,
      this.vertices.byteLength + this.normals.byteLength,
      this.texCoord
    );

    this.vbo = vbo;
    return vbo;
  }

  public ComputeIBO(device: GPUDevice): GPUBuffer {
    const ibo = device.createBuffer({
      size: this.indices.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX,
      label: "Vertex Buffer(pos, normal)",
    });

    device.queue.writeBuffer(ibo, 0, this.indices);

    this.ibo = ibo;
    return ibo;
  }

  public GetVBO(): GPUBuffer {
    if (!this.vbo) {
      throw new Error("vbo is null");
    }
    return this.vbo;
  }

  public GetIBO(): GPUBuffer {
    if (!this.ibo) {
      throw new Error("ibo is null");
    }
    return this.ibo;
  }
}

export class UnitBox implements PrimitiveData
{
  vertices: Float32Array;
  indices: Uint16Array;

  vbo: GPUBuffer | null = null;
  ibo: GPUBuffer | null = null;

  constructor(scale: 1.0)
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
  }


  public ComputeVBO(device: GPUDevice): GPUBuffer {
    const vbo = device.createBuffer({
      size: this.vertices.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
      label: "Vertex Buffer(pos, normal, uv)",
    });

    device.queue.writeBuffer(vbo, 0, this.vertices);
    this.vbo = vbo;
    return vbo;
  }

  public ComputeIBO(device: GPUDevice): GPUBuffer {
    const ibo = device.createBuffer({
      size: this.indices.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX,
      label: "Vertex Buffer(pos, normal)",
    });

    device.queue.writeBuffer(ibo, 0, this.indices);

    this.ibo = ibo;
    return ibo;
  }
}

class Sphere implements PrimitiveData
{
  vertices: Float32Array;
  indices: Uint16Array;

  vbo: GPUBuffer | null = null;
  ibo: GPUBuffer | null = null;

  constructor()
  {
    this.vertices = new Float32Array([
      // float3 position, float3 normal, float2 uv
      0,1,0,  0,1,0,  0.05,1,
      0,1,0,  0,1,0,  0.15,1,
      0,1,0,  0,1,0,  0.25,1,
      0,1,0,  0,1,0,  0.35,1,
      0,1,0,  0,1,0,  0.45,1,
      0,1,0,  0,1,0,  0.55,1,
      0,1,0,  0,1,0,  0.65,1,
      0,1,0,  0,1,0,  0.75,1,
      0,1,0,  0,1,0,  0.85,1,
      0,1,0,  0,1,0,  0.95,1,
      0,1,0,  0,1,0,  1.05,1,
      -0.30902,0.95106,0,     -0.30902,0.95106,0,     0,0.9,
      -0.25,0.95106,0.18164, -0.25,0.95106,0.18164, 0.1,0.9,
      -0.09549,0.95106,0.29389, -0.09549,0.95106,0.29389, 0.2,0.9,
      0.09549,0.95106,0.29389, 0.09549,0.95106,0.29389, 0.3,0.9,
      0.25,0.95106,0.18164, 0.25,0.95106,0.18164, 0.4,0.9,
      0.30902,0.95106,0, 0.30902,0.95106,0, 0.5,0.9,
      0.25,0.95106,-0.18164, 0.25,0.95106,-0.18164, 0.6,0.9,
      0.09549,0.95106,-0.29389, 0.09549,0.95106,-0.29389, 0.7,0.9,
      -0.09549,0.95106,-0.29389, -0.09549,0.95106,-0.29389, 0.8,0.9,
      -0.25,0.95106,-0.18164, -0.25,0.95106,-0.18164, 0.9,0.9,
      -0.30902,0.95106,0, -0.30902,0.95106,0, 1,0.9,
      -0.58779,0.80902,0, -0.58779,0.80902,0, 0,0.8,
      -0.47553,0.80902,0.34549, -0.47553,0.80902,0.34549, 0.1,0.8,
      -0.18164,0.80902,0.55902, -0.18164,0.80902,0.55902, 0.2,0.8,
      0.18164,0.80902,0.55902, 0.18164,0.80902,0.55902, 0.3,0.8,
      0.47553,0.80902,0.34549, 0.47553,0.80902,0.34549, 0.4,0.8,
      0.58779,0.80902,0, 0.58779,0.80902,0, 0.5,0.8,
      0.47553,0.80902,-0.34549, 0.47553,0.80902,-0.34549, 0.6,0.8,
      0.18164,0.80902,-0.55902, 0.18164,0.80902,-0.55902, 0.7,0.8,
      -0.18164,0.80902,-0.55902, -0.18164,0.80902,-0.55902, 0.8,0.8,
      -0.47553,0.80902,-0.34549, -0.47553,0.80902,-0.34549, 0.9,0.8,
      -0.58779,0.80902,0, -0.58779,0.80902,0, 1,0.8,
      -0.80902,0.58779,0, -0.80902,0.58779,0, 0,0.7,
      -0.65451,0.58779,0.47553, -0.65451,0.58779,0.47553, 0.1,0.7,
      -0.25,0.58779,0.76942, -0.25,0.58779,0.76942, 0.2,0.7,
      0.25,0.58779,0.76942, 0.25,0.58779,0.76942, 0.3,0.7,
      0.65451,0.58779,0.47553, 0.65451,0.58779,0.47553, 0.4,0.7,
      0.80902,0.58779,0, 0.80902,0.58779,0, 0.5,0.7,
      0.65451,0.58779,-0.47553, 0.65451,0.58779,-0.47553, 0.6,0.7,
      0.25,0.58779,-0.76942, 0.25,0.58779,-0.76942, 0.7,0.7,
      -0.25,0.58779,-0.76942, -0.25,0.58779,-0.76942, 0.8,0.7,
      -0.65451,0.58779,-0.47553, -0.65451,0.58779,-0.47553, 0.9,0.7,
      -0.80902,0.58779,0, -0.80902,0.58779,0, 1,0.7,
      -0.95106,0.30902,0, -0.95106,0.30902,0, 0,0.6,
      -0.76942,0.30902,0.55902, -0.76942,0.30902,0.55902, 0.1,0.6,
      -0.29389,0.30902,0.90451, -0.29389,0.30902,0.90451, 0.2,0.6,
      0.29389,0.30902,0.90451, 0.29389,0.30902,0.90451, 0.3,0.6,
      0.76942,0.30902,0.55902, 0.76942,0.30902,0.55902, 0.4,0.6,
      0.95106,0.30902,0, 0.95106,0.30902,0, 0.5,0.6,
      0.76942,0.30902,-0.55902, 0.76942,0.30902,-0.55902, 0.6,0.6,
      0.29389,0.30902,-0.90451, 0.29389,0.30902,-0.90451, 0.7,0.6,
      -0.29389,0.30902,-0.90451, -0.29389,0.30902,-0.90451, 0.8,0.6,
      -0.76942,0.30902,-0.55902, -0.76942,0.30902,-0.55902, 0.9,0.6,
      -0.95106,0.30902,0, -0.95106,0.30902,0, 1,0.6,
      -1,0,0, -1,0,0, 0,0.5,
      -0.80902,0,0.58779, -0.80902,0,0.58779, 0.1,0.5,
      -0.30902,0,0.95106, -0.30902,0,0.95106, 0.2,0.5,
      0.30902,0,0.95106, 0.30902,0,0.95106, 0.3,0.5,
      0.80902,0,0.58779, 0.80902,0,0.58779, 0.4,0.5,
      1,0,0, 1,0,0, 0.5,0.5,
      0.80902,0,-0.58779, 0.80902,0,-0.58779, 0.6,0.5,
      0.30902,0,-0.95106, 0.30902,0,-0.95106, 0.7,0.5,
      -0.30902,0,-0.95106, -0.30902,0,-0.95106, 0.8,0.5,
      -0.80902,0,-0.58779, -0.80902,0,-0.58779, 0.9,0.5,
      -1,0,0, -1,0,0, 1,0.5,
      -0.95106,-0.30902,0, -0.95106,-0.30902,0, 0,0.4,
      -0.76942,-0.30902,0.55902, -0.76942,-0.30902,0.55902, 0.1,0.4,
      -0.29389,-0.30902,0.90451, -0.29389,-0.30902,0.90451, 0.2,0.4,
      0.29389,-0.30902,0.90451, 0.29389,-0.30902,0.90451, 0.3,0.4,
      0.76942,-0.30902,0.55902, 0.76942,-0.30902,0.55902, 0.4,0.4,
      0.95106,-0.30902,0, 0.95106,-0.30902,0, 0.5,0.4,
      0.76942,-0.30902,-0.55902, 0.76942,-0.30902,-0.55902, 0.6,0.4,
      0.29389,-0.30902,-0.90451, 0.29389,-0.30902,-0.90451, 0.7,0.4,
      -0.29389,-0.30902,-0.90451, -0.29389,-0.30902,-0.90451, 0.8,0.4,
      -0.76942,-0.30902,-0.55902, -0.76942,-0.30902,-0.55902, 0.9,0.4,
      -0.95106,-0.30902,0, -0.95106,-0.30902,0, 1,0.4,
      -0.80902,-0.58779,0, -0.80902,-0.58779,0, 0,0.3,
      -0.65451,-0.58779,0.47553, -0.65451,-0.58779,0.47553, 0.1,0.3,
      -0.25,-0.58779,0.76942, -0.25,-0.58779,0.76942, 0.2,0.3,
      0.25,-0.58779,0.76942, 0.25,-0.58779,0.76942, 0.3,0.3,
      0.65451,-0.58779,0.47553, 0.65451,-0.58779,0.47553, 0.4,0.3,
      0.80902,-0.58779,0, 0.80902,-0.58779,0, 0.5,0.3,
      0.65451,-0.58779,-0.47553, 0.65451,-0.58779,-0.47553, 0.6,0.3,
      0.25,-0.58779,-0.76942, 0.25,-0.58779,-0.76942, 0.7,0.3,
      -0.25,-0.58779,-0.76942, -0.25,-0.58779,-0.76942, 0.8,0.3,
      -0.65451,-0.58779,-0.47553, -0.65451,-0.58779,-0.47553, 0.9,0.3,
      -0.80902,-0.58779,0, -0.80902,-0.58779,0, 1,0.3,
      -0.58779,-0.80902,0, -0.58779,-0.80902,0, 0,0.2,
      -0.47553,-0.80902,0.34549, -0.47553,-0.80902,0.34549, 0.1,0.2,
      -0.18164,-0.80902,0.55902, -0.18164,-0.80902,0.55902, 0.2,0.2,
      0.18164,-0.80902,0.55902, 0.18164,-0.80902,0.55902, 0.3,0.2,
      0.47553,-0.80902,0.34549, 0.47553,-0.80902,0.34549, 0.4,0.2,
      0.58779,-0.80902,0, 0.58779,-0.80902,0, 0.5,0.2,
      0.47553,-0.80902,-0.34549, 0.47553,-0.80902,-0.34549, 0.6,0.2,
      0.18164,-0.80902,-0.55902, 0.18164,-0.80902,-0.55902, 0.7,0.2,
      -0.18164,-0.80902,-0.55902, -0.18164,-0.80902,-0.55902, 0.8,0.2,
      -0.47553,-0.80902,-0.34549, -0.47553,-0.80902,-0.34549, 0.9,0.2,
      -0.58779,-0.80902,0, -0.58779,-0.80902,0, 1,0.2,
      -0.30902,-0.95106,0, -0.30902,-0.95106,0, 0,0.1,
      -0.25,-0.95106,0.18164, -0.25,-0.95106,0.18164, 0.1,0.1,
      -0.09549,-0.95106,0.29389, -0.09549,-0.95106,0.29389, 0.2,0.1,
      0.09549,-0.95106,0.29389, 0.09549,-0.95106,0.29389, 0.3,0.1,
      0.25,-0.95106,0.18164, 0.25,-0.95106,0.18164, 0.4,0.1,
      0.30902,-0.95106,0, 0.30902,-0.95106,0, 0.5,0.1,
      0.25,-0.95106,-0.18164, 0.25,-0.95106,-0.18164, 0.6,0.1,
      0.09549,-0.95106,-0.29389, 0.09549,-0.95106,-0.29389, 0.7,0.1,
      -0.09549,-0.95106,-0.29389, -0.09549,-0.95106,-0.29389, 0.8,0.1,
      -0.25,-0.95106,-0.18164, -0.25,-0.95106,-0.18164, 0.9,0.1,
      -0.30902,-0.95106,0, -0.30902,-0.95106,0, 1,0.1,
      0,-1,0, 0,-1,0, -0.05,0,
      0,-1,0, 0,-1,0, 0.05,0,
      0,-1,0, 0,-1,0, 0.15,0,
      0,-1,0, 0,-1,0, 0.25,0,
      0,-1,0, 0,-1,0, 0.35,0,
      0,-1,0, 0,-1,0, 0.45,0,
      0,-1,0, 0,-1,0, 0.55,0,
      0,-1,0, 0,-1,0, 0.65,0,
      0,-1,0, 0,-1,0, 0.75,0,
      0,-1,0, 0,-1,0, 0.85,0,
      0,-1,0, 0,-1,0, 0.95,0
    ]);

    this.indices = new Uint16Array([
      0,11,12,
      1,12,13,
      2,13,14,
      3,14,15,
      4,15,16,
      5,16,17,
      6,17,18,
      7,18,19,
      8,19,20,
      9,20,21,
      12,11,23,
      11,22,23,
      13,12,24,
      12,23,24,
      14,13,25,
      13,24,25,
      15,14,26,
      14,25,26,
      16,15,27,
      15,26,27,
      17,16,28,
      16,27,28,
      18,17,29,
      17,28,29,
      19,18,30,
      18,29,30,
      20,19,31,
      19,30,31,
      21,20,32,
      20,31,32,
      23,22,34,
      22,33,34,
      24,23,35,
      23,34,35,
      25,24,36,
      24,35,36,
      26,25,37,
      25,36,37,
      27,26,38,
      26,37,38,
      28,27,39,
      27,38,39,
      29,28,40,
      28,39,40,
      30,29,41,
      29,40,41,
      31,30,42,
      30,41,42,
      32,31,43,
      31,42,43,
      34,33,45,
      33,44,45,
      35,34,46,
      34,45,46,
      36,35,47,
      35,46,47,
      37,36,48,
      36,47,48,
      38,37,49,
      37,48,49,
      39,38,50,
      38,49,50,
      40,39,51,
      39,50,51,
      41,40,52,
      40,51,52,
      42,41,53,
      41,52,53,
      43,42,54,
      42,53,54,
      45,44,56,
      44,55,56,
      46,45,57,
      45,56,57,
      47,46,58,
      46,57,58,
      48,47,59,
      47,58,59,
      49,48,60,
      48,59,60,
      50,49,61,
      49,60,61,
      51,50,62,
      50,61,62,
      52,51,63,
      51,62,63,
      53,52,64,
      52,63,64,
      54,53,65,
      53,64,65,
      56,55,67,
      55,66,67,
      57,56,68,
      56,67,68,
      58,57,69,
      57,68,69,
      59,58,70,
      58,69,70,
      60,59,71,
      59,70,71,
      61,60,72,
      60,71,72,
      62,61,73,
      61,72,73,
      63,62,74,
      62,73,74,
      64,63,75,
      63,74,75,
      65,64,76,
      64,75,76,
      67,66,78,
      66,77,78,
      68,67,79,
      67,78,79,
      69,68,80,
      68,79,80,
      70,69,81,
      69,80,81,
      71,70,82,
      70,81,82,
      72,71,83,
      71,82,83,
      73,72,84,
      72,83,84,
      74,73,85,
      73,84,85,
      75,74,86,
      74,85,86,
      76,75,87,
      75,86,87,
      78,77,89,
      77,88,89,
      79,78,90,
      78,89,90,
      80,79,91,
      79,90,91,
      81,80,92,
      80,91,92,
      82,81,93,
      81,92,93,
      83,82,94,
      82,93,94,
      84,83,95,
      83,94,95,
      85,84,96,
      84,95,96,
      86,85,97,
      85,96,97,
      87,86,98,
      86,97,98,
      89,88,100,
      88,99,100,
      90,89,101,
      89,100,101,
      91,90,102,
      90,101,102,
      92,91,103,
      91,102,103,
      93,92,104,
      92,103,104,
      94,93,105,
      93,104,105,
      95,94,106,
      94,105,106,
      96,95,107,
      95,106,107,
      97,96,108,
      96,107,108,
      98,97,109,
      97,108,109,
      100,99,111,
      101,100,112,
      102,101,113,
      103,102,114,
      104,103,115,
      105,104,116,
      106,105,117,
      107,106,118,
      108,107,119,
      109,108,120
    ]);
  }

  public ComputeVBO(device: GPUDevice): GPUBuffer {
    const vbo = device.createBuffer({
      size: this.vertices.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
      label: "Vertex Buffer(pos, normal, uv)",
    });

    device.queue.writeBuffer(vbo, 0, this.vertices);
    this.vbo = vbo;
    return vbo;
  }

  public ComputeIBO(device: GPUDevice): GPUBuffer {
    const ibo = device.createBuffer({
      size: this.indices.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX,
      label: "Vertex Buffer(pos, normal)",
    });

    device.queue.writeBuffer(ibo, 0, this.indices);

    this.ibo = ibo;
    return ibo;
  }


}