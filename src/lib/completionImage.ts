export type CompletionImageOptions = {
  title: string;
  completedAt: string;
  totalMedals: number;
  currentTitleName: string;
  imageBlob: Blob;
};

const loadImage = (blob: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("完成画像の読み込みに失敗しました。"));
    };
    image.src = url;
  });

const drawWrappedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number => {
  const characters = Array.from(text);
  const lines: string[] = [];
  let line = "";

  characters.forEach((character) => {
    const nextLine = `${line}${character}`;
    if (context.measureText(nextLine).width > maxWidth && line) {
      lines.push(line);
      line = character;
      return;
    }
    line = nextLine;
  });

  if (line) {
    lines.push(line);
  }

  lines.forEach((lineText, index) => {
    context.fillText(lineText, x, y + index * lineHeight);
  });

  return y + Math.max(1, lines.length) * lineHeight;
};

export const createCompletionImageBlob = async (
  options: CompletionImageOptions,
): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1600;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvasを初期化できませんでした。");
  }

  const image = await loadImage(options.imageBlob);
  const padding = 72;
  const imageBox = {
    x: padding,
    y: 260,
    width: canvas.width - padding * 2,
    height: 900,
  };
  const imageScale = Math.max(imageBox.width / image.width, imageBox.height / image.height);
  const drawWidth = image.width * imageScale;
  const drawHeight = image.height * imageScale;
  const drawX = imageBox.x + (imageBox.width - drawWidth) / 2;
  const drawY = imageBox.y + (imageBox.height - drawHeight) / 2;

  context.fillStyle = "#fff7df";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f6fbec";
  context.fillRect(0, 0, canvas.width, 210);
  context.fillStyle = "#fffaf0";
  context.fillRect(42, 42, canvas.width - 84, canvas.height - 84);
  context.strokeStyle = "#c77a16";
  context.lineWidth = 10;
  context.strokeRect(42, 42, canvas.width - 84, canvas.height - 84);

  context.fillStyle = "#2d7b62";
  context.font = '700 34px "Yu Gothic UI", Meiryo, sans-serif';
  context.fillText("しゃしんパズルコレクション", padding, 124);

  context.fillStyle = "#5d3515";
  context.font = '900 62px "Yu Gothic UI", Meiryo, sans-serif';
  drawWrappedText(context, options.title, padding, 204, canvas.width - padding * 2, 72);

  context.save();
  context.beginPath();
  context.roundRect(imageBox.x, imageBox.y, imageBox.width, imageBox.height, 28);
  context.clip();
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  context.restore();
  context.strokeStyle = "#5d3515";
  context.lineWidth = 8;
  context.strokeRect(imageBox.x, imageBox.y, imageBox.width, imageBox.height);

  const completedDate = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(options.completedAt));

  context.fillStyle = "#2d2417";
  context.font = '800 42px "Yu Gothic UI", Meiryo, sans-serif';
  context.fillText("完成！メダルを1枚ゲット", padding, 1250);

  context.font = '700 34px "Yu Gothic UI", Meiryo, sans-serif';
  context.fillStyle = "#6c5b40";
  context.fillText(`完成日: ${completedDate}`, padding, 1320);
  context.fillText(`合計メダル: ${options.totalMedals}枚`, padding, 1380);
  context.fillText(`現在の称号: ${options.currentTitleName}`, padding, 1440);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("完成画像の作成に失敗しました。"));
    }, "image/png");
  });
};
