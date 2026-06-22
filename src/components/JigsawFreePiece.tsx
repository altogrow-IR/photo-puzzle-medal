import { useId } from "react";
import { createJigsawPath } from "../lib/jigsawUtils";
import { useJigsawDrag } from "../hooks/useJigsawDrag";
import type { JigsawPieceState } from "../types/puzzle";

type JigsawFreePieceProps = {
  piece: JigsawPieceState;
  gridSize: number;
  imageUrl: string;
  onDragStart: (pieceId: string) => void;
  onDragMove: (pieceId: string, x: number, y: number) => void;
  onDragEnd: (pieceId: string, pointerType: string) => void;
};

export function JigsawFreePiece({
  piece,
  gridSize,
  imageUrl,
  onDragStart,
  onDragMove,
  onDragEnd,
}: JigsawFreePieceProps) {
  const clipId = useId().replace(/:/g, "");
  const path = createJigsawPath(piece.width, piece.height, piece.shape);
  const dragHandlers = useJigsawDrag({ piece, onDragStart, onDragMove, onDragEnd });
  const tabPadding = Math.min(piece.width, piece.height) * 0.22;

  return (
    <div
      className={`jigsaw-piece ${piece.isSnapped ? "snapped" : ""}`}
      style={{
        width: piece.width + tabPadding * 2,
        height: piece.height + tabPadding * 2,
        transform: `translate3d(${piece.x - tabPadding}px, ${piece.y - tabPadding}px, 0)`,
        zIndex: piece.zIndex,
      }}
      {...dragHandlers}
      aria-label={`ジグソーピース ${piece.correctIndex + 1}`}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`${-tabPadding} ${-tabPadding} ${piece.width + tabPadding * 2} ${piece.height + tabPadding * 2}`}
        role="img"
      >
        <defs>
          <clipPath id={clipId}>
            <path d={path} />
          </clipPath>
        </defs>
        <image
          href={imageUrl}
          x={-piece.col * piece.width}
          y={-piece.row * piece.height}
          width={piece.width * gridSize}
          height={piece.height * gridSize}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
        />
        <path className="jigsaw-piece-outline" d={path} />
      </svg>
    </div>
  );
}
