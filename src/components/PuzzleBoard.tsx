import { useCallback, useEffect, useMemo, useState } from "react";
import { getImage } from "../lib/db";
import { createPuzzlePieces, isPuzzleSolved, shufflePieces, swapPieces } from "../lib/puzzleUtils";
import { usePuzzleTimer } from "../hooks/usePuzzleTimer";
import type { CompletionResult, PuzzleItem, PuzzlePiece } from "../types/puzzle";
import { CompletionModal } from "./CompletionModal";
import { PuzzlePieceTile } from "./PuzzlePieceTile";

type PuzzleBoardProps = {
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

export function PuzzleBoard({ puzzle, totalMedals, onComplete, onBackHome }: PuzzleBoardProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [pieces, setPieces] = useState<PuzzlePiece[]>(() => shufflePieces(createPuzzlePieces(puzzle.gridSize)));
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [draggedPieceId, setDraggedPieceId] = useState<string | null>(null);
  const [moves, setMoves] = useState(0);
  const [playKey, setPlayKey] = useState(() => `${puzzle.id}-${Date.now()}`);
  const [hasCompletedCurrentPlay, setHasCompletedCurrentPlay] = useState(false);
  const [completionResult, setCompletionResult] = useState<CompletionResult | undefined>();
  const [error, setError] = useState("");

  const elapsedSeconds = usePuzzleTimer(!hasCompletedCurrentPlay && Boolean(imageUrl), playKey);

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

  const orderedPieces = useMemo(
    () => [...pieces].sort((a, b) => a.currentIndex - b.currentIndex),
    [pieces],
  );

  const resetPlay = useCallback(() => {
    setPieces(shufflePieces(createPuzzlePieces(puzzle.gridSize)));
    setMoves(0);
    setSelectedPieceId(null);
    setDraggedPieceId(null);
    setHasCompletedCurrentPlay(false);
    setCompletionResult(undefined);
    setPlayKey(`${puzzle.id}-${Date.now()}`);
  }, [puzzle.gridSize, puzzle.id]);

  const performSwap = useCallback(
    (firstId: string, secondId: string) => {
      if (firstId === secondId || hasCompletedCurrentPlay) {
        setSelectedPieceId(null);
        return;
      }

      setPieces((currentPieces) => swapPieces(currentPieces, firstId, secondId));
      setMoves((current) => current + 1);
      setSelectedPieceId(null);
    },
    [hasCompletedCurrentPlay],
  );

  const handleSelect = (pieceId: string) => {
    if (!selectedPieceId) {
      setSelectedPieceId(pieceId);
      return;
    }

    performSwap(selectedPieceId, pieceId);
  };

  const handleRetryClick = () => {
    if (window.confirm("今のプレイをやり直しますか？手数と時間がリセットされます。")) {
      resetPlay();
    }
  };

  useEffect(() => {
    if (!imageUrl || hasCompletedCurrentPlay || !isPuzzleSolved(pieces)) {
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
    <section className="play-screen">
      <div className="play-header">
        <div>
          <span className="eyebrow">挑戦中</span>
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

      <div className="play-layout">
        <div className="board-area">
          <div className="play-stats">
            <span>手数 {moves}</span>
            <span>時間 {formatSeconds(elapsedSeconds)}</span>
            <span>メダル {totalMedals}枚</span>
          </div>

          {error && <p className="error-message">{error}</p>}

          <div
            className="puzzle-board"
            style={{ gridTemplateColumns: `repeat(${puzzle.gridSize}, 1fr)` }}
          >
            {imageUrl &&
              orderedPieces.map((piece) => (
                <PuzzlePieceTile
                  key={piece.id}
                  piece={piece}
                  gridSize={puzzle.gridSize}
                  imageUrl={imageUrl}
                  isSelected={selectedPieceId === piece.id}
                  onSelect={handleSelect}
                  onDragStart={setDraggedPieceId}
                  onDropPiece={(pieceId) => {
                    if (draggedPieceId) {
                      performSwap(draggedPieceId, pieceId);
                      setDraggedPieceId(null);
                    }
                  }}
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
          moves={moves}
          onReplay={resetPlay}
          onBackHome={onBackHome}
        />
      )}
    </section>
  );
}
