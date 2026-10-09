export const createId = (): string => {
  if ("randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const loadImage = (source: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像の読み込みに失敗しました。"));
    };
    image.src = url;
  });

export const resizeImageToBlob = async (
  source: Blob,
  maxSize: number,
  mimeType = "image/jpeg",
  quality = 0.88,
  crop = { x: 50, y: 50 },
): Promise<Blob> => {
  const image = await loadImage(source);
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const width = Math.max(1, Math.min(maxSize, side));
  const height = width;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvasを利用できないため、画像を保存できませんでした。");
  }

  context.drawImage(image, (image.naturalWidth-side)*crop.x/100, (image.naturalHeight-side)*crop.y/100, side, side, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("画像の変換に失敗しました。"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
};

export const blobToObjectUrl = (blob: Blob): string => URL.createObjectURL(blob);
