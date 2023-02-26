export enum TextureConstant {
  DefaultTextureUsage = GPUTextureUsage.TEXTURE_BINDING |
    GPUTextureUsage.COPY_DST |
    GPUTextureUsage.RENDER_ATTACHMENT,
}

export class Texture2D {

  private constructor(public device : GPUDevice, public texture: GPUTexture, public sampler: GPUSampler) {}

  static Create(device: GPUDevice, descriptor: GPUTextureDescriptor) {
    const texture = device.createTexture(descriptor);
    const sampler = device.createSampler({
      label: "Texture 2D Sampler",
      addressModeU: "repeat",
      addressModeV: "repeat",
    });
    return new Texture2D(device, texture, sampler);
  }

  static async FromURL(
    device: GPUDevice,
    path: string,
    usage: GPUTextureUsageFlags
  ) {
    const res = await fetch(path);
    const img = await res.blob();
    const bitmap = await createImageBitmap(img);

    const texture = device.createTexture({
      format: "rgba8unorm",
      size: [bitmap.width, bitmap.height, 1],
      usage: usage,
      label: "texture2D",
    });

    const sampler = device.createSampler({
      label: "Texture 2D Sampler",
      addressModeU: "repeat",
      addressModeV: "repeat",
      minFilter : "linear",
      magFilter: "linear"
    });

    device.queue.copyExternalImageToTexture(
      { source: bitmap },
      { texture: texture },
      [bitmap.width, bitmap.height, 1]
    );

    return new Texture2D(device, texture, sampler);
  }

  static async FromManyURL(
    device: GPUDevice,
    paths: string[],
    usage: GPUTextureUsageFlags
  ) {
    const Load = async (url : string) => {
      const res = await fetch(url);
      const img = await res.blob();
      const bitmap = await createImageBitmap(img);
      return {bitmap, img};
    };

    const data = await Load(paths[0]);
    const w = data.bitmap.width;
    const h = data.bitmap.height;
    const layers = paths.length;
    // const formats = new Array<GPUTextureFormat>();
    // formats.fill("rgba8unorm");

    const texture = device.createTexture({
      format: "rgba8unorm",
      size: [w, h, layers],
      usage: usage,
      dimension: "2d",
      //viewFormats: formats,
      label: "texture2D",
    });
    const sampler = device.createSampler({
      label: "Texture 2D Array Sampler"
    });

    device.queue.copyExternalImageToTexture(
      { source: data.bitmap },
      {
        texture: texture,
        origin: [0, 0, 0],
      },
      [w, h, 1]
    );

    const obj = new Texture2D(device, texture, sampler);

    for (let i = 0; i < layers; ++i) {
      const local = await Load(paths[i]);
      if (local.bitmap.width != w || local.bitmap.height != h) {
        throw new Error(`rez don't math in file ${paths[i]}`);
      }

      device.queue.copyExternalImageToTexture(
        { source: local.bitmap},
        {
          texture: obj.texture,
          origin: [0, 0, i],
        },
        [w, h, 1]
      );

      console.log(`${paths[i]} done.`);
    }
    
    return obj;
  }
}
