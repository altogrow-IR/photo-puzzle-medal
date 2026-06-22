import { PointerEvent, useRef } from "react";
import type { JigsawPieceState } from "../types/puzzle";

type UseJigsawDragParams = {
  piece: JigsawPieceState;
  originX: number;
  originY: number;
  onDragStart: (pieceId: string) => void;
  onDragMove: (pieceId: string, x: number, y: number) => void;
  onDragEnd: (pieceId: string, pointerType: string) => void;
};

export const useJigsawDrag = ({
  piece,
  originX,
  originY,
  onDragStart,
  onDragMove,
  onDragEnd,
}: UseJigsawDragParams) => {
  const offsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (piece.isSnapped) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    offsetRef.current = {
      x: event.clientX - originX - piece.x,
      y: event.clientY - originY - piece.y,
    };
    onDragStart(piece.id);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || piece.isSnapped) {
      return;
    }

    onDragMove(
      piece.id,
      event.clientX - originX - offsetRef.current.x,
      event.clientY - originY - offsetRef.current.y,
    );
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) {
      return;
    }

    draggingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    onDragEnd(piece.id, event.pointerType);
  };

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
  };
};
