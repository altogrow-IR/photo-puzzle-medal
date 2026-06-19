import type { DragEvent } from "react";
import type { PuzzlePiece } from "../types/puzzle";

type PuzzlePieceTileProps = {
  piece: PuzzlePiece;
  gridSize: number;
  imageUrl: string;
  isSelected: boolean;
  onSelect: (pieceId: string) => void;
  onDragStart: (pieceId: string) => void;
  onDropPiece: (pieceId: string) => void;
};

export function PuzzlePieceTile({
  piece,
  gridSize,
  imageUrl,
  isSelected,
  onSelect,
  onDragStart,
  onDropPiece,
}: PuzzlePieceTileProps) {
  const backgroundSize = `${gridSize * 100}% ${gridSize * 100}%`;
  const backgroundPosition = `${(piece.col / (gridSize - 1)) * 100}% ${(piece.row / (gridSize - 1)) * 100}%`;

  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <button
      className={`puzzle-tile ${isSelected ? "selected" : ""}`}
      type="button"
      draggable
      onClick={() => onSelect(piece.id)}
      onDragStart={() => onDragStart(piece.id)}
      onDragOver={handleDragOver}
      onDrop={() => onDropPiece(piece.id)}
      style={{
        backgroundImage: `url(${imageUrl})`,
        backgroundSize,
        backgroundPosition,
      }}
      aria-label={`パズルピース ${piece.correctIndex + 1}`}
    />
  );
}
