import type { JigsawEdge, JigsawPieceShape, JigsawPieceState } from "../types/puzzle";

export const SNAP_THRESHOLD_DESKTOP = 24;
export const SNAP_THRESHOLD_TOUCH = 36;

const oppositeEdge = (edge: JigsawEdge): JigsawEdge => {
  if (edge === "tab") {
    return "blank";
  }
  if (edge === "blank") {
    return "tab";
  }
  return "flat";
};

export const getDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const shuffleNumbers = (count: number): number[] => {
  const values = Array.from({ length: count }, (_, index) => index);

  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }

  if (count > 1 && values.every((value, index) => value === index)) {
    [values[0], values[1]] = [values[1], values[0]];
  }

  return values;
};

export const createJigsawShapes = (gridSize: number): JigsawPieceShape[] => {
  const shapes: JigsawPieceShape[] = [];

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const top =
        row === 0 ? "flat" : oppositeEdge(shapes[(row - 1) * gridSize + col].bottom);
      const left =
        col === 0 ? "flat" : oppositeEdge(shapes[row * gridSize + col - 1].right);
      const right: JigsawEdge =
        col === gridSize - 1 ? "flat" : Math.random() > 0.5 ? "tab" : "blank";
      const bottom: JigsawEdge =
        row === gridSize - 1 ? "flat" : Math.random() > 0.5 ? "tab" : "blank";

      shapes.push({ top, right, bottom, left });
    }
  }

  return shapes;
};

export const createJigsawPath = (
  width: number,
  height: number,
  shape: JigsawPieceShape,
): string => {
  const tab = Math.min(width, height) * 0.2;
  const thirdW = width / 3;
  const thirdH = height / 3;

  const topCurve =
    shape.top === "flat"
      ? `L ${width} 0`
      : `L ${thirdW} 0 C ${thirdW} ${shape.top === "tab" ? -tab : tab}, ${thirdW * 2} ${
          shape.top === "tab" ? -tab : tab
        }, ${thirdW * 2} 0 L ${width} 0`;

  const rightCurve =
    shape.right === "flat"
      ? `L ${width} ${height}`
      : `L ${width} ${thirdH} C ${width + (shape.right === "tab" ? tab : -tab)} ${thirdH}, ${
          width + (shape.right === "tab" ? tab : -tab)
        } ${thirdH * 2}, ${width} ${thirdH * 2} L ${width} ${height}`;

  const bottomCurve =
    shape.bottom === "flat"
      ? `L 0 ${height}`
      : `L ${thirdW * 2} ${height} C ${thirdW * 2} ${height + (shape.bottom === "tab" ? tab : -tab)}, ${thirdW} ${
          height + (shape.bottom === "tab" ? tab : -tab)
        }, ${thirdW} ${height} L 0 ${height}`;

  const leftCurve =
    shape.left === "flat"
      ? "L 0 0"
      : `L 0 ${thirdH * 2} C ${shape.left === "tab" ? -tab : tab} ${thirdH * 2}, ${
          shape.left === "tab" ? -tab : tab
        } ${thirdH}, 0 ${thirdH} L 0 0`;

  return `M 0 0 ${topCurve} ${rightCurve} ${bottomCurve} ${leftCurve} Z`;
};

export const createJigsawPieces = (
  gridSize: number,
  boardSize: number,
  trayTop: number,
): JigsawPieceState[] => {
  const pieceSize = boardSize / gridSize;
  const shapes = createJigsawShapes(gridSize);
  const trayColumns = Math.max(3, Math.min(gridSize, 4));
  const trayRows = Math.ceil(shapes.length / trayColumns);
  const shuffledSlots = shuffleNumbers(shapes.length);
  const xStep = trayColumns > 1 ? (boardSize - pieceSize) / (trayColumns - 1) : 0;
  const yStep = pieceSize + 18;
  const jitterRangeX = Math.max(10, pieceSize * 0.3);
  const jitterRangeY = Math.max(8, pieceSize * 0.22);

  return shapes.map((shape, index) => {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const slotIndex = shuffledSlots[index];
    const trayCol = slotIndex % trayColumns;
    const trayRow = Math.floor(slotIndex / trayColumns);
    const baseX = trayCol * xStep;
    const baseY = trayTop + trayRow * yStep;
    const jitterX = (Math.random() - 0.5) * jitterRangeX;
    const jitterY = (Math.random() - 0.5) * jitterRangeY;
    const maxY = trayTop + Math.max(0, trayRows - 1) * yStep + pieceSize * 0.18;

    return {
      id: `jigsaw-${index}`,
      correctIndex: index,
      row,
      col,
      x: clamp(baseX + jitterX, 0, Math.max(0, boardSize - pieceSize)),
      y: clamp(baseY + jitterY, trayTop, maxY),
      targetX: col * pieceSize,
      targetY: row * pieceSize,
      width: pieceSize,
      height: pieceSize,
      isSnapped: false,
      zIndex: index + 1,
      shape,
    };
  });
};
