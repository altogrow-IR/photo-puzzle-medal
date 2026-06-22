import type { JigsawEdge, JigsawPieceShape, JigsawPieceState } from "../types/puzzle";

export const SNAP_THRESHOLD_DESKTOP = 24;
export const SNAP_THRESHOLD_TOUCH = 36;

export type JigsawTrayArea = {
  x: number;
  y: number;
  width: number;
  height: number;
  flow: "grid" | "compact";
};

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

const getTraySlotPosition = (
  slotIndex: number,
  pieceCount: number,
  pieceWidth: number,
  pieceHeight: number,
  trayArea: JigsawTrayArea,
) => {
  const gap = 10;
  const safeWidth = Math.max(pieceWidth, trayArea.width);
  const safeHeight = Math.max(pieceHeight, trayArea.height);
  const prefersGrid = trayArea.flow === "grid";
  const rowCount = prefersGrid
    ? Math.max(1, Math.floor((safeHeight + gap) / (pieceHeight + gap)))
    : pieceCount > 16 && safeHeight >= pieceHeight * 1.8
      ? 2
      : 1;
  const columnCount = Math.max(1, Math.ceil(pieceCount / rowCount));
  const col = slotIndex % columnCount;
  const row = Math.floor(slotIndex / columnCount);
  const xStep =
    columnCount > 1
      ? Math.min(pieceWidth + gap, Math.max(0, (safeWidth - pieceWidth) / (columnCount - 1)))
      : 0;
  const yStep =
    rowCount > 1
      ? Math.min(pieceHeight + gap, Math.max(0, (safeHeight - pieceHeight) / (rowCount - 1)))
      : 0;

  return {
    x: trayArea.x + col * xStep,
    y: trayArea.y + row * yStep,
  };
};

export const arrangeJigsawPiecesInTray = (
  pieces: JigsawPieceState[],
  gridSize: number,
  boardWidth: number,
  boardHeight: number,
  trayArea: JigsawTrayArea,
): JigsawPieceState[] => {
  const pieceWidth = boardWidth / gridSize;
  const pieceHeight = boardHeight / gridSize;
  const shuffledSlots = shuffleNumbers(pieces.length);
  const jitterRangeX = Math.max(4, pieceWidth * 0.12);
  const jitterRangeY = Math.max(4, pieceHeight * 0.12);

  return pieces.map((piece, index) => {
    const slotIndex = shuffledSlots[index];
    const slot = getTraySlotPosition(slotIndex, pieces.length, pieceWidth, pieceHeight, trayArea);
    const jitterX = (Math.random() - 0.5) * jitterRangeX;
    const jitterY = (Math.random() - 0.5) * jitterRangeY;

    if (piece.isSnapped) {
      return {
        ...piece,
        targetX: piece.col * pieceWidth,
        targetY: piece.row * pieceHeight,
        x: piece.col * pieceWidth,
        y: piece.row * pieceHeight,
        width: pieceWidth,
        height: pieceHeight,
      };
    }

    return {
      ...piece,
      x: slot.x + jitterX,
      y: slot.y + jitterY,
      targetX: piece.col * pieceWidth,
      targetY: piece.row * pieceHeight,
      width: pieceWidth,
      height: pieceHeight,
    };
  });
};

export const createJigsawPieces = (
  gridSize: number,
  boardWidth: number,
  boardHeight: number,
  trayArea: JigsawTrayArea,
): JigsawPieceState[] => {
  const pieceWidth = boardWidth / gridSize;
  const pieceHeight = boardHeight / gridSize;
  const shapes = createJigsawShapes(gridSize);

  return arrangeJigsawPiecesInTray(
    shapes.map((shape, index) => {
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;

      return {
        id: `jigsaw-${index}`,
        correctIndex: index,
        row,
        col,
        x: 0,
        y: 0,
        targetX: col * pieceWidth,
        targetY: row * pieceHeight,
        width: pieceWidth,
        height: pieceHeight,
        isSnapped: false,
        zIndex: index + 1,
        shape,
      };
    }),
    gridSize,
    boardWidth,
    boardHeight,
    trayArea,
  );
};
