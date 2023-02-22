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

export class ParametricSphere {
  vertices: Float32Array; // x_y_z, nx_ny_nz, u_v
  indices: Uint32Array;
  radius: number;
  center: vec3;
  nVertices: number;

  vbo: GPUBuffer | undefined;
  ibo: GPUBuffer | undefined;
  ubo: GPUBuffer | undefined;
  uboOffset: number = 0;

  mvp: MVP;

  constructor(radius: number, center: vec3, nVerts: number) {
    this.nVertices = nVerts;
    this.center = center;
    this.radius = radius;

    const data = ParametricSphere.GenerateSphere(radius, center, nVerts);
    this.vertices = ParametricSphere.VerticesToFloat32Array(data.vertices);
    this.indices = new Uint32Array(data.indices);

    this.mvp = {
        modelView : mat4.create(),
        modelViewInv: mat4.create(),
        proj: mat4.create(),
        projInv : mat4.create()
    }
  }

  GenerateVBO(device: GPUDevice) {
    this.vbo = device.createBuffer({
      size: this.vertices.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
      label: "P Sphere Vertex Buffer(pos, normal, uv)",
    });
    return this.vbo;
  }

  GenerateIBO(device: GPUDevice) {
    this.ibo = device.createBuffer({
      size: this.indices.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX,
      label: "P Sphere Index Buffer",
    });
    return this.ibo;
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

  GetVertexAttributeLayout(): GPUVertexBufferLayout[] {
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

    let dataOffset = 0;
    device.queue.writeBuffer(this.ubo, this.uboOffset + dataOffset, this.mvp.modelView as Float32Array);
    
    dataOffset += GeomConstant.MAT4_SIZE;
    device.queue.writeBuffer(this.ubo, this.uboOffset + dataOffset, this.mvp.proj as Float32Array);
    
    dataOffset += GeomConstant.MAT4_SIZE;
    device.queue.writeBuffer(this.ubo, this.uboOffset + dataOffset, this.mvp.modelViewInv as Float32Array);
    
    dataOffset += GeomConstant.MAT4_SIZE;
    device.queue.writeBuffer(this.ubo, this.uboOffset + dataOffset, this.mvp.projInv as Float32Array);
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

  static GenerateSphere(
    radius: number,
    centerLocation: vec3,
    numVertices: number
  ): { vertices: Vertex[]; indices: number[] } {
    const vertices: Vertex[] = [];
    const indices: number[] = [];

    for (let i = 0; i < numVertices; i++) {
      const theta = (i / (numVertices - 1)) * Math.PI; // angle around y-axis
      const phi =
        ((i + 1) % 2 ? i / numVertices : i / numVertices - 1) * Math.PI; // angle around z-axis

      const x = radius * Math.sin(theta) * Math.cos(phi);
      const y = radius * Math.cos(theta);
      const z = radius * Math.sin(theta) * Math.sin(phi);

      const position: vec3 = vec3.fromValues(x, y, z);
      vec3.add(position, position, centerLocation);

      const normal: vec3 = vec3.clone(position);
      vec3.normalize(normal, normal);

      const texCoord: vec2 = vec2.fromValues(
        phi / (2 * Math.PI),
        theta / Math.PI
      );

      vertices.push({ position, normal, texCoord });
    }

    // generate indices
    for (let i = 0; i < numVertices; i++) {
      for (let j = 0; j < numVertices; j++) {
        const i1 = i;
        const j1 = j;
        const i2 = (i + 1) % numVertices;
        const j2 = j;
        const i3 = (i + 1) % numVertices;
        const j3 = (j + 1) % numVertices;

        indices.push(i1 * numVertices + j1);
        indices.push(i2 * numVertices + j2);
        indices.push(i3 * numVertices + j3);

        indices.push(i3 * numVertices + j3);
        indices.push(i2 * numVertices + j2);
        indices.push(i1 * numVertices + j1);
      }
    }

    return { vertices, indices };
  }
}
