// Merge one or more captured page photos into a single tall JPEG (base64, no prefix).
export async function mergePagesToBase64(files: File[]): Promise<string> {
  const images = await Promise.all(files.map(loadImage));
  const width = Math.min(1600, Math.max(...images.map((i) => i.width)));
  const scaled = images.map((img) => ({
    img,
    w: width,
    h: Math.round((img.height / img.width) * width),
  }));
  const gap = 24;
  const height = scaled.reduce((sum, s) => sum + s.h, 0) + gap * (scaled.length - 1);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the scanned pages on this device.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  let y = 0;
  for (const s of scaled) {
    ctx.drawImage(s.img, 0, y, s.w, s.h);
    y += s.h + gap;
  }

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  images.forEach((i) => URL.revokeObjectURL(i.src));
  return dataUrl.split(",")[1] ?? "";
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not read the photo "${file.name}".`));
    img.src = URL.createObjectURL(file);
  });
}
