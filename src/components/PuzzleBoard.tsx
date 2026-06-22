import { useCallback, useEffect, useMemo, useState } from "react";
import { getImage, savePuzzleProgress } from "../lib/db";
import { createPuzzlePieces, isPuzzleSolved, shufflePieces, swapPieces } from "../lib/puzzleUtils";
import { usePuzzleTimer } from "../hooks/usePuzzleTimer";
import type { CompletionResult, PuzzleItem, PuzzlePiece, SavedPuzzleProgress } from "../types/puzzle";
import { CompletionModal } from "./CompletionModal";
import { PuzzlePieceTile } from "./PuzzlePieceTile";

type PuzzleBoardProps = {
  puzzle: PuzzleItem;
  totalMedals: number;
  initialProgress?: SavedPuzzleProgress;
  onComplete: (puzzle: PuzzleItem) => Promise<CompletionResult>;
  onBackHome: () => void;
  onProgressSaved: (progress: SavedPuzzleProgress) => void;
};

type InitialTileState = {
  pieces: PuzzlePiece[];
  moves: number;
  elapsedSeconds: number;
  restoreError: string;
};

const formatSeconds = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return `${minutes}:${restSeconds.toString().padStart(2, "0")}`;
};

const createInitialState = (
  puzzle: PuzzleItem,
  progress?: SavedPuzzleProgress,
): InitialTileState => {
  if (!progress) {
    return {
      pieces: shufflePieces(createPuzzlePieces(puzzle.gridSize)),
      moves: 0,
      elapsedSeconds: 0,
      restoreError: "",
    };
  }

  if (
    progress.mode !== "tile" ||
    !progress.tilePieces ||
    progress.tilePieces.length !== puzzle.gridSize * puzzle.gridSize
  ) {
    return {
      pieces: shufflePieces(createPuzzlePieces(puzzle.gridSize)),
      moves: 0,
      elapsedSeconds: 0,
      restoreError: "途中保存を読み込めませんでした。最初から遊べます。",
    };
  }

  return {
    pieces: progress.tilePieces,
    moves: progress.moveCount,
    elapsedSeconds: progress.elapsedSeconds,
    restoreError: "",
  };
};

export function PuzzleBoard({
  puzzle,
  totalMedals,
  initialProgress,
  onComplete,
  onBackHome,
  onProgressSaved,
}: PuzzleBoardProps) {
  const restoredState = useMemo(
    () => createInitialState(puzzle, initialProgress),
    [initialProgress, puzzle],
  );
  const [imageUrl, setImageUrl] = useState("");
  const [imageBlob, setImageBlob] = useState<Blob | undefined>();
  const [pieces, setPieces] = useState<PuzzlePiece[]>(restoredState.pieces);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [draggedPieceId, setDraggedPieceId] = useState<string | null>(null);
  const [moves, setMoves] = useState(restoredState.moves);
  const [timerBaseSeconds, setTimerBaseSeconds] = useState(restoredState.elapsedSeconds);
  const [playKey, setPlayKey] = useState(() => `${puzzle.id}-${Date.now()}`);
  const [hasCompletedCurrentPlay, setHasCompletedCurrentPlay] = useState(false);
  const [completionResult, setCompletionResult] = useState<CompletionResult | undefined>();
  const [error, setError] = useState(restoredState.restoreError);
  const [saveMessage, setSaveMessage] = useState("");
  const [isBackChoiceOpen, setIsBackChoiceOpen] = useState(false);

  const elapsedSeconds = usePuzzleTimer(!hasCompletedCurrentPlay && Boolean(imageUrl), playKey, timerBaseSeconds);
  const hasUnsavedPlay = !hasCompletedCurrentPlay && (moves > 0 || Boolean(initialProgress));

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
        setImageBlob(image.blob);
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

  const buildProgress = useCallback(
    (): SavedPuzzleProgress => ({
      id: `${puzzle.id}:tile`,
      puzzleId: puzzle.id,
      mode: "tile",
      status: hasCompletedCurrentPlay ? "completed" : "playing",
      savedAt: new Date().toISOString(),
      elapsedSeconds,
      moveCount: moves,
      tilePieces: pieces,
    }),
    [elapsedSeconds, hasCompletedCurrentPlay, moves, pieces, puzzle.id],
  );

  const handleSaveProgress = useCallback(async (): Promise<SavedPuzzleProgress> => {
    const progress = buildProgress();
    await savePuzzleProgress(progress);
    onProgressSaved(progress);
    setSaveMessage("ここまで保存したよ！つづきからまた遊べるよ");
    return progress;
  }, [buildProgress, onProgressSaved]);

  const resetPlay = useCallback(() => {
    setPieces(shufflePieces(createPuzzlePieces(puzzle.gridSize)));
    setMoves(0);
    setTimerBaseSeconds(0);
    setSelectedPieceId(null);
    setDraggedPieceId(null);
    setHasCompletedCurrentPlay(false);
    setCompletionResult(undefined);
    setSaveMessage("");
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
      setSaveMessage("");
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

  const handleBackClick = () => {
    if (!hasUnsavedPlay) {
      onBackHome();
      return;
    }
    setIsBackChoiceOpen(true);
  };

  const handleSaveAndBack = async () => {
    await handleSaveProgress();
    onBackHome();
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
          <button className="secondary-button" type="button" onClick={handleSaveProgress}>
            一時保存
          </button>
          <button className="secondary-button" type="button" onClick={handleRetryClick}>
            やり直し
          </button>
          <button className="secondary-button" type="button" onClick={handleBackClick}>
            保存して一覧に戻る
          </button>
        </div>
      </div>

      {saveMessage && <p className="success-message">{saveMessage}</p>}
      {error && <p className="error-message">{error}</p>}

      <div className="play-layout">
        <div className="board-area">
          <div className="play-stats">
            <span>手数 {moves}</span>
            <span>時間 {formatSeconds(elapsedSeconds)}</span>
            <span>メダル {totalMedals}枚</span>
          </div>

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

      {isBackChoiceOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="save-before-back-title">
          <div className="choice-dialog">
            <h2 id="save-before-back-title">途中経過を保存してから戻りますか？</h2>
            <div className="modal-actions">
              <button className="primary-button" type="button" onClick={handleSaveAndBack}>
                保存して戻る
              </button>
              <button className="secondary-button" type="button" onClick={onBackHome}>
                保存せず戻る
              </button>
              <button className="secondary-button" type="button" onClick={() => setIsBackChoiceOpen(false)}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {hasCompletedCurrentPlay && (
        <CompletionModal
          completionResult={completionResult}
          fallbackTotalMedals={totalMedals}
          elapsedSeconds={elapsedSeconds}
          moves={moves}
          puzzleTitle={puzzle.title}
          imageBlob={imageBlob}
          imageUrl={imageUrl}
          onReplay={resetPlay}
          onBackHome={onBackHome}
        />
      )}
    </section>
  );
}
