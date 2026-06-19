import type { PuzzlePiece } from "../types/puzzle";

export const createPuzzlePieces = (gridSize: number): PuzzlePiece[] =>
  Array.from({ length: gridSize * gridSize }, (_, index) => ({
    id: `piece-${index}`,
    correctIndex: index,
    currentIndex: index,
    row: Math.floor(index / gridSize),
    col: index % gridSize,
  }));

const isSolvedOrder = (pieces: PuzzlePiece[]): boolean =>
  pieces.every((piece) => piece.correctIndex === piece.currentIndex);

export const shufflePieces = (pieces: PuzzlePiece[]): PuzzlePiece[] => {
  const shuffledIndexes = pieces.map((piece) => piece.currentIndex);

  for (let i = shuffledIndexes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledIndexes[i], shuffledIndexes[j]] = [shuffledIndexes[j], shuffledIndexes[i]];
  }

  const shuffled = pieces.map((piece, index) => ({
    ...piece,
    currentIndex: shuffledIndexes[index],
  }));

  if (isSolvedOrder(shuffled) && shuffled.length > 1) {
    return swapPieces(shuffled, shuffled[0].id, shuffled[1].id);
  }

  return shuffled;
};

export const swapPieces = (pieces: PuzzlePiece[], firstId: string, secondId: string): PuzzlePiece[] => {
  if (firstId === secondId) {
    return pieces;
  }

  const first = pieces.find((piece) => piece.id === firstId);
  const second = pieces.find((piece) => piece.id === secondId);
  if (!first || !second) {
    return pieces;
  }

  return pieces.map((piece) => {
    if (piece.id === firstId) {
      return { ...piece, currentIndex: second.currentIndex };
    }
    if (piece.id === secondId) {
      return { ...piece, currentIndex: first.currentIndex };
    }
    return piece;
  });
};

export const isPuzzleSolved = (pieces: PuzzlePiece[]): boolean =>
  pieces.every((piece) => piece.correctIndex === piece.currentIndex);
