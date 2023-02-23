
export enum TextureConstant
{
    DefaultTextureUsage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    
}



export class Texture2D {
  width: number = 0;
  height: number = 0;
  texture: GPUTexture | undefined;
  format: GPUTextureFormat | undefined;
  usage: GPUTextureUsageFlags | undefined;
  sampler : GPUSampler | undefined;

  private constructor() {}

  static async FromURL(device: GPUDevice, path: string, usage: GPUTextureUsageFlags) {
    const res = await fetch(path);
    const img = await res.blob();
    // const img = document.createElement("img") as HTMLImageElement;
    // img.src = textureUrl;
    // await img.decode();
    const bitmap = await createImageBitmap(img);

    const obj = new Texture2D();
    obj.usage = usage;
    obj.width = bitmap.width;
    obj.height = bitmap.height;
    obj.format = "rgba8unorm";

    obj.texture = device.createTexture({
      format: obj.format,
      size: [obj.width, obj.height, 1],
      usage: obj.usage,
      label: "texture2D"
    });

    obj.sampler = device.createSampler({
      label: "Texture 2D Sampler",
    });

    device.queue.copyExternalImageToTexture(
      { source: bitmap },
      { texture: obj.texture },
      [bitmap.width, bitmap.height, 1]
    );

    return obj;
  }
}
