export interface HeroImage {
  name: string;
  dataUrl: string;
}

const maxInputBytes = 5 * 1024 * 1024;
const maxOutputBytes = 1024 * 1024;
const maxDecodedPixels = 24_000_000;

export function hasValidImageSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  }
  if (mimeType === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Gambar tidak dapat dibuka."));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob?.type === "image/webp") resolve(blob);
      else reject(new Error("Browser tidak mendukung pemrosesan gambar WebP."));
    }, "image/webp", quality);
  });
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Gambar tidak dapat dibaca."));
    };
    reader.onerror = () => reject(new Error("Gambar tidak dapat dibaca."));
    reader.readAsDataURL(blob);
  });
}

export async function processHeroImage(file: File): Promise<HeroImage> {
  if (file.size === 0 || file.size > maxInputBytes) {
    throw new Error("Ukuran gambar harus lebih dari 0 dan maksimal 5 MB.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidImageSignature(bytes, file.type)) {
    throw new Error("Pilih gambar JPG, PNG, atau WebP yang valid.");
  }

  const image = await loadImage(file);
  if (!image.naturalWidth || !image.naturalHeight ||
    image.naturalWidth * image.naturalHeight > maxDecodedPixels) {
    throw new Error("Resolusi gambar terlalu besar.");
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak mendukung pemrosesan gambar.");

  for (const maxEdge of [1600, 1200, 900]) {
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.8, 0.65]) {
      const blob = await toWebp(canvas, quality);
      if (blob.size <= maxOutputBytes) {
        return { name: file.name, dataUrl: await toDataUrl(blob) };
      }
    }
  }

  throw new Error("Gambar masih terlalu besar setelah diproses. Pilih gambar lain.");
}
