
export enum TextureConstant
{
    DefaultTextureUsage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    
}



export class Texture2D 
{
  texture: GPUTexture | undefined;
  sampler : GPUSampler | undefined;

  private constructor() {}

  static async FromURL(device: GPUDevice, path: string, usage: GPUTextureUsageFlags) {
    const res = await fetch(path);
    const img = await res.blob();
    const bitmap = await createImageBitmap(img);
    
    const obj = new Texture2D();

    obj.texture = device.createTexture({
      format: 'rgba8unorm',
      size: [bitmap.width, bitmap.height, 1],
      usage: usage,
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
