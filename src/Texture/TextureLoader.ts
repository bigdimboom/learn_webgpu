async function LoadTexture(path: string) {
  const res = await fetch(path);
  const img = await res.blob();
  // const img = document.createElement("img") as HTMLImageElement;
  // img.src = textureUrl;
  // await img.decode();
  const bitmap = await createImageBitmap(img);
  if (bitmap) {
    postMessage({ status: true, bitmap: bitmap });
    return;
  }
  postMessage({ status: false });
}

addEventListener("message", ({ data }) => {
  console.log("worker thread: ", data.texPath);
  LoadTexture(data.texPath);
});

export {};
