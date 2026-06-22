import { useCallback, useEffect, useRef, useState } from "react";
import { getImage } from "../lib/db";
import {
  createJigsawPieces,
  getDistance,
  SNAP_THRESHOLD_DESKTOP,
  SNAP_THRESHOLD_TOUCH,
} from "../lib/jigsawUtils";
import { PUZZLE_MODE_LABELS } from "../lib/puzzleMode";
import { usePuzzleTimer } from "../hooks/usePuzzleTimer";
import type { CompletionResult, JigsawPieceState, PuzzleItem } from "../types/puzzle";
import { CompletionModal } from "./CompletionModal";
import { JigsawFreePiece } from "./JigsawFreePiece";

type JigsawFreePlayBoardProps = {
  puzzle: PuzzleItem;
  totalMedals: number;
  onComplete: (puzzle: PuzzleItem) => Promise<CompletionResult>;
  onBackHome: () => void;
};

const formatSeconds = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return `${minutes}:${restSeconds.toString().padStart(2, "0")}`;
};

export function JigsawFreePlayBoard({
  puzzle,
  totalMedals,
  onComplete,
  onBackHome,
}: JigsawFreePlayBoardProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [boardSize, setBoardSize] = useState(360);
  const [imageUrl, setImageUrl] = useState("");
  const [pieces, setPieces] = useState<JigsawPieceState[]>([]);
  const [moveCount, setMoveCount] = useState(0);
  const [playKey, setPlayKey] = useState(() => `${puzzle.id}-${Date.now()}`);
  const [hasCompletedCurrentPlay, setHasCompletedCurrentPlay] = useState(false);
  const [completionResult, setCompletionResult] = useState<CompletionResult | undefined>();
  const [error, setError] = useState("");

  const trayTop = boardSize + 34;
  const trayRows = Math.ceil(puzzle.pieceCount / Math.max(3, Math.min(puzzle.gridSize, 4)));
  const pieceSize = boardSize / puzzle.gridSize;
  const stageHeight = trayTop + trayRows * (pieceSize + 16) + 18;
  const elapsedSeconds = usePuzzleTimer(!hasCompletedCurrentPlay && Boolean(imageUrl), playKey);

  useEffect(() => {
    const element = stageRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      const nextSize = Math.max(280, Math.min(620, element.clientWidth));
      setBoardSize(nextSize);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;
    let objectUrl = "";

    getImage(puzzle.imageId)
      .then((image) => {
        if (!isMounted) {
          return;
        }
        if (!image) {
          setError("写真データが見つかりません。");
          return;
        }
        objectUrl = URL.createObjectURL(image.blob);
        setImageUrl(objectUrl);
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : "写真の読み込みに失敗しました。");
        }
      });

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [puzzle.imageId]);

  const resetPlay = useCallback(() => {
    setPieces(createJigsawPieces(puzzle.gridSize, boardSize, trayTop));
    setMoveCount(0);
    setHasCompletedCurrentPlay(false);
    setCompletionResult(undefined);
    setPlayKey(`${puzzle.id}-${Date.now()}`);
  }, [boardSize, puzzle.gridSize, puzzle.id, trayTop]);

  useEffect(() => {
    resetPlay();
  }, [resetPlay]);

  const bringToFront = (pieceId: string) => {
    setPieces((current) => {
      const maxZ = Math.max(...current.map((piece) => piece.zIndex), 0);
      return current.map((piece) => (piece.id === pieceId ? { ...piece, zIndex: maxZ + 1 } : piece));
    });
  };

  const movePiece = (pieceId: string, x: number, y: number) => {
    setPieces((current) =>
      current.map((piece) => {
        if (piece.id !== pieceId || piece.isSnapped) {
          return piece;
        }

        return { ...piece, x, y };
      }),
    );
  };

  const finishDrag = (pieceId: string, pointerType: string) => {
    setMoveCount((current) => current + 1);
    setPieces((current) =>
      current.map((piece) => {
        if (piece.id !== pieceId || piece.isSnapped) {
          return piece;
        }

        const threshold = pointerType === "touch" ? SNAP_THRESHOLD_TOUCH : SNAP_THRESHOLD_DESKTOP;
        if (getDistance(piece.x, piece.y, piece.targetX, piece.targetY) > threshold) {
          return piece;
        }

        return {
          ...piece,
          x: piece.targetX,
          y: piece.targetY,
          isSnapped: true,
        };
      }),
    );
  };

  const handleRetryClick = () => {
    if (window.confirm("今のプレイをやり直しますか？動かした回数と時間がリセットされます。")) {
      resetPlay();
    }
  };

  useEffect(() => {
    if (!imageUrl || hasCompletedCurrentPlay || pieces.length === 0) {
      return;
    }

    const isCompleted = pieces.every((piece) => piece.isSnapped);
    if (!isCompleted) {
      return;
    }

    setHasCompletedCurrentPlay(true);
    onComplete(puzzle)
      .then(setCompletionResult)
      .catch(() => {
        setError("完成記録の保存に失敗しました。メダル表示が更新されない場合があります。");
      });
  }, [hasCompletedCurrentPlay, imageUrl, onComplete, pieces, puzzle]);

  return (
    <section className="play-screen jigsaw-screen">
      <div className="play-header">
        <div>
          <span className="eyebrow">{PUZZLE_MODE_LABELS.jigsaw}</span>
          <h2>{puzzle.title}</h2>
        </div>
        <div className="play-actions">
          <button className="secondary-button" type="button" onClick={handleRetryClick}>
            やり直し
          </button>
          <button className="secondary-button" type="button" onClick={onBackHome}>
            一覧に戻る
          </button>
        </div>
      </div>

      <div className="jigsaw-layout">
        <div className="jigsaw-main">
          <div className="play-stats">
            <span>動かした回数 {moveCount}</span>
            <span>時間 {formatSeconds(elapsedSeconds)}</span>
            <span>メダル {totalMedals}枚</span>
          </div>
          {puzzle.gridSize >= 6 && (
            <p className="hint-message">
              ピース数が多いので、スマホでは少し細かい操作になります。拡大表示しながら遊ぶのがおすすめです。
            </p>
          )}
          {error && <p className="error-message">{error}</p>}

          <div className="jigsaw-stage" ref={stageRef} style={{ height: stageHeight }}>
            <div className="jigsaw-target-board" style={{ width: boardSize, height: boardSize }}>
              {imageUrl && <img src={imageUrl} alt={`${puzzle.title}の完成見本`} />}
            </div>
            <div className="jigsaw-tray-label" style={{ top: trayTop - 28 }}>
              ピース置き場
            </div>
            {imageUrl &&
              pieces.map((piece) => (
                <JigsawFreePiece
                  key={piece.id}
                  piece={piece}
                  gridSize={puzzle.gridSize}
                  imageUrl={imageUrl}
                  onDragStart={bringToFront}
                  onDragMove={movePiece}
                  onDragEnd={finishDrag}
                />
              ))}
          </div>
        </div>

        <aside className="sample-panel">
          <span className="eyebrow">完成見本</span>
          {imageUrl ? <img src={imageUrl} alt={`${puzzle.title}の完成見本`} /> : <p>読み込み中</p>}
          <p>
            {puzzle.gridSize}×{puzzle.gridSize} / {puzzle.pieceCount}ピース
          </p>
        </aside>
      </div>

      {hasCompletedCurrentPlay && (
        <CompletionModal
          completionResult={completionResult}
          fallbackTotalMedals={totalMedals}
          elapsedSeconds={elapsedSeconds}
          moves={moveCount}
          moveLabel="動かした回数"
          moveUnit="回"
          onReplay={resetPlay}
          onBackHome={onBackHome}
        />
      )}
    </section>
  );
}
