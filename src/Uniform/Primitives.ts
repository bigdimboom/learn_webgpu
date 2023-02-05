import { initWebGPU } from "../utils/WgpuContext";
import { vec3 } from "gl-matrix";

export class UnitCube {
  vertices: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;

  vbo: GPUBuffer | null = null;
  ibo: GPUBuffer | null = null;

  public constructor(scale: number = 1.0) {
    const vertices: vec3[] = [
      // Front face
      vec3.fromValues(-1.0, 1.0, 1.0),
      vec3.fromValues(1.0, 1.0, 1.0),
      vec3.fromValues(-1.0, -1.0, 1.0),
      vec3.fromValues(1.0, -1.0, 1.0),

      // Back face
      vec3.fromValues(-1.0, 1.0, -1.0),
      vec3.fromValues(1.0, 1.0, -1.0),
      vec3.fromValues(-1.0, -1.0, -1.0),
      vec3.fromValues(1.0, -1.0, -1.0),
    ];

    const indices = new Uint16Array([
      // Front face
      0, 1, 2, 2, 1, 3,

      // Right face
      1, 5, 3, 3, 5, 7,

      // Back face
      5, 4, 7, 7, 4, 6,

      // Left face
      4, 0, 6, 6, 0, 2,

      // Top face
      4, 5, 0, 0, 5, 1,

      // Bottom face
      2, 3, 6, 6, 3, 7,
    ]);

    const tmpNormals: vec3[] = new Array(vertices.length).fill(
      vec3.fromValues(0, 0, 0)
    );

    for (let i = 0; i < indices.length; i += 3) {
      const p1 = vertices[indices[i]];
      const p2 = vertices[indices[i + 1]];
      const p3 = vertices[indices[i + 2]];

      const vec1 = vec3.subtract(vec3.create(), p2, p1);
      const vec2 = vec3.subtract(vec3.create(), p3, p2);
      const n = vec3.cross(vec3.create(), vec1, vec2);

      for (let ii = 0; ii < 3; ++ii)
      {
        tmpNormals[indices[i + ii]] = vec3.add(vec3.create(), tmpNormals[indices[i + ii]], n);
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
