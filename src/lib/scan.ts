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

const HEIC = /\.(heic|heif)$/i;

/**
 * iPhone/iPad/Mac photos are often HEIC. Convert them to JPEG in the browser so
 * every device sends a format the reader understands.
 */
export async function normalizeImageFile(file: File): Promise<File> {
  const isHeic = HEIC.test(file.name) || /heic|heif/i.test(file.type);
  if (!isHeic) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(2000, bitmap.width);
    canvas.height = Math.round((bitmap.height / bitmap.width) * canvas.width);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9),
    );
    if (!blob) throw new Error("no blob");
    return new File([blob], file.name.replace(HEIC, ".jpg"), { type: "image/jpeg" });
  } catch {
    throw new Error(
      "This iPhone photo (HEIC) couldn't be read here. Please share it as JPEG — on iPhone: Settings › Camera › Formats › Most Compatible, or open the photo and choose Share › Options › JPEG.",
    );
  }
}
