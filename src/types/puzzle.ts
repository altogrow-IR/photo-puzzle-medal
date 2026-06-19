export type PuzzleMode = "tile" | "jigsaw";

export type PuzzleItem = {
  id: string;
  title: string;
  imageId: string;
  thumbnailId: string;
  gridSize: number;
  pieceCount: number;
  mode: PuzzleMode;
  completedCount: number;
  createdAt: string;
  updatedAt: string;
  lastPlayedAt?: string;
};

export type StoredImage = {
  id: string;
  blob: Blob;
  mimeType: string;
  createdAt: string;
};

export type AppStats = {
  totalMedals: number;
  totalCompleted: number;
  updatedAt: string;
};

export type PuzzlePiece = {
  id: string;
  correctIndex: number;
  currentIndex: number;
  row: number;
  col: number;
};

export type JigsawEdge = "flat" | "tab" | "blank";

export type JigsawPieceShape = {
  top: JigsawEdge;
  right: JigsawEdge;
  bottom: JigsawEdge;
  left: JigsawEdge;
};

export type JigsawPieceState = {
  id: string;
  correctIndex: number;
  row: number;
  col: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  width: number;
  height: number;
  isSnapped: boolean;
  zIndex: number;
  shape: JigsawPieceShape;
};

export type MedalTitle = {
  id: string;
  name: string;
  requiredMedals: number;
  description: string;
};

export type CompletionResult = {
  totalMedals: number;
  currentTitle: MedalTitle;
  gainedTitle?: MedalTitle;
};
