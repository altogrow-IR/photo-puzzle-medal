import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getImage, savePuzzleProgress } from "../lib/db";
import {
  arrangeJigsawPiecesInTray,
  createJigsawPieces,
  getDistance,
  SNAP_THRESHOLD_DESKTOP,
  SNAP_THRESHOLD_TOUCH,
  type JigsawTrayArea,
} from "../lib/jigsawUtils";
import { PUZZLE_MODE_LABELS } from "../lib/puzzleMode";
import { useElementSize, type Size } from "../hooks/useElementSize";
import { usePuzzleTimer } from "../hooks/usePuzzleTimer";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import type { CompletionResult, JigsawPieceState, PuzzleItem, SavedPuzzleProgress } from "../types/puzzle";
import { CompletionModal } from "./CompletionModal";
import { JigsawFreePiece } from "./JigsawFreePiece";

type JigsawFreePlayBoardProps = {
  puzzle: PuzzleItem;
  totalMedals: number;
  initialProgress?: SavedPuzzleProgress;
  onComplete: (puzzle: PuzzleItem) => Promise<CompletionResult>;
  onBackHome: () => void;
  onProgressSaved: (progress: SavedPuzzleProgress) => void;
};

type RestoredJigsawState = {
  pieces: JigsawPieceState[];
  moves: number;
  elapsedSeconds: number;
  restoreError: string;
};

type BoardOrigin = {
  x: number;
  y: number;
};

const DEFAULT_IMAGE_SIZE: Size = { width: 1, height: 1 };
const DEFAULT_BOARD_SIZE: Size = { width: 360, height: 360 };

const formatSeconds = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return `${minutes}:${restSeconds.toString().padStart(2, "0")}`;
};

const calculateBoardSize = (panelSize: Size, imageSize: Size, isMobile: boolean): Size => {
  const boardMargin = isMobile ? 4 : 8;
  const availableWidth = Math.max(0, panelSize.width - boardMargin * 2);
  const availableHeight = Math.max(0, panelSize.height - boardMargin * 2);

  if (availableWidth <= 0 || availableHeight <= 0) {
    return DEFAULT_BOARD_SIZE;
  }

  const imageAspectRatio = Math.max(0.2, imageSize.width / Math.max(1, imageSize.height));
  let width = availableWidth;
  let height = width / imageAspectRatio;

  if (height > availableHeight) {
    height = availableHeight;
    width = height * imageAspectRatio;
  }

  return {
    width: Math.max(160, width),
    height: Math.max(160, height),
  };
};

const scaleSavedPieces = (
  pieces: JigsawPieceState[],
  gridSize: number,
  savedBoardWidth: number,
  savedBoardHeight: number,
  boardSize: Size,
): JigsawPieceState[] => {
  const scaleX = savedBoardWidth > 0 ? boardSize.width / savedBoardWidth : 1;
  const scaleY = savedBoardHeight > 0 ? boardSize.height / savedBoardHeight : 1;
  const pieceWidth = boardSize.width / gridSize;
  const pieceHeight = boardSize.height / gridSize;

  return pieces.map((piece) => {
    const targetX = piece.col * pieceWidth;
    const targetY = piece.row * pieceHeight;

    return {
      ...piece,
      x: piece.isSnapped ? targetX : piece.x * scaleX,
      y: piece.isSnapped ? targetY : piece.y * scaleY,
      targetX,
      targetY,
      width: pieceWidth,
      height: pieceHeight,
    };
  });
};

const createRestoredState = (
  puzzle: PuzzleItem,
  progress: SavedPuzzleProgress | undefined,
  boardSize: Size,
  trayArea: JigsawTrayArea,
): RestoredJigsawState => {
  if (!progress) {
    return {
      pieces: createJigsawPieces(puzzle.gridSize, boardSize.width, boardSize.height, trayArea),
      moves: 0,
      elapsedSeconds: 0,
      restoreError: "",
    };
  }

  if (
    progress.mode !== "jigsaw" ||
    !progress.jigsawPieces ||
    progress.jigsawPieces.length !== puzzle.gridSize * puzzle.gridSize
  ) {
    return {
      pieces: createJigsawPieces(puzzle.gridSize, boardSize.width, boardSize.height, trayArea),
      moves: 0,
      elapsedSeconds: 0,
      restoreError: "途中保存を読み込めませんでした。最初から遊べます。",
    };
  }

  const restoredPieces =
    progress.boardWidth && progress.boardHeight
      ? scaleSavedPieces(progress.jigsawPieces, puzzle.gridSize, progress.boardWidth, progress.boardHeight, boardSize)
      : arrangeJigsawPiecesInTray(progress.jigsawPieces, puzzle.gridSize, boardSize.width, boardSize.height, trayArea);

  return {
    pieces: restoredPieces,
    moves: progress.moveCount,
    elapsedSeconds: progress.elapsedSeconds,
    restoreError: "",
  };
};

export function JigsawFreePlayBoard({
  puzzle,
  totalMedals,
  initialProgress,
  onComplete,
  onBackHome,
  onProgressSaved,
}: JigsawFreePlayBoardProps) {
  const layout = useResponsiveLayout();
  const previousBoardSizeRef = useRef<Size | null>(null);
  const [layoutRef, layoutSize] = useElementSize<HTMLDivElement>();
  const [boardPanelRef, boardPanelSize] = useElementSize<HTMLDivElement>();
  const [trayRef, traySize] = useElementSize<HTMLDivElement>();
  const [boardOrigin, setBoardOrigin] = useState<BoardOrigin>({ x: 0, y: 0 });
  const [trayArea, setTrayArea] = useState<JigsawTrayArea>({
    x: 0,
    y: DEFAULT_BOARD_SIZE.height + 24,
    width: DEFAULT_BOARD_SIZE.width,
    height: 120,
    flow: "compact",
  });
  const [imageSize, setImageSize] = useState<Size>(DEFAULT_IMAGE_SIZE);
  const [imageUrl, setImageUrl] = useState("");
  const [imageBlob, setImageBlob] = useState<Blob | undefined>();
  const [pieces, setPieces] = useState<JigsawPieceState[]>([]);
  const [moveCount, setMoveCount] = useState(0);
  const [timerBaseSeconds, setTimerBaseSeconds] = useState(0);
  const [playKey, setPlayKey] = useState(() => `${puzzle.id}-${Date.now()}`);
  const [hasCompletedCurrentPlay, setHasCompletedCurrentPlay] = useState(false);
  const [completionResult, setCompletionResult] = useState<CompletionResult | undefined>();
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isBackChoiceOpen, setIsBackChoiceOpen] = useState(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [hasInitializedPieces, setHasInitializedPieces] = useState(false);

  const isMobile = !layout.isTablet;
  const boardSize = useMemo(
    () => calculateBoardSize(boardPanelSize, imageSize, isMobile),
    [boardPanelSize, imageSize, isMobile],
  );
  const isBoardReady = boardPanelSize.width > 0 && boardPanelSize.height > 0 && traySize.width > 0 && traySize.height > 0;
  const elapsedSeconds = usePuzzleTimer(!hasCompletedCurrentPlay && Boolean(imageUrl), playKey, timerBaseSeconds);
  const hasUnsavedPlay = !hasCompletedCurrentPlay && (moveCount > 0 || Boolean(initialProgress));

  useLayoutEffect(() => {
    const layoutElement = layoutRef.current;
    const boardPanelElement = boardPanelRef.current;
    const trayElement = trayRef.current;

    if (!layoutElement || !boardPanelElement || !trayElement) {
      return;
    }

    const layoutRect = layoutElement.getBoundingClientRect();
    const boardPanelRect = boardPanelElement.getBoundingClientRect();
    const trayRect = trayElement.getBoundingClientRect();
    const nextBoardOrigin = {
      x: boardPanelRect.left - layoutRect.left + Math.max(0, (boardPanelRect.width - boardSize.width) / 2),
      y: boardPanelRect.top - layoutRect.top + Math.max(0, (boardPanelRect.height - boardSize.height) / 2),
    };

    setBoardOrigin(nextBoardOrigin);
    setTrayArea({
      x: trayRect.left - layoutRect.left - nextBoardOrigin.x + 8,
      y: trayRect.top - layoutRect.top - nextBoardOrigin.y + 8,
      width: Math.max(80, trayRect.width - 16),
      height: Math.max(72, trayRect.height - 16),
      flow: layout.isTabletLandscape ? "grid" : "compact",
    });
  }, [
    boardPanelRef,
    boardPanelSize,
    boardSize.height,
    boardSize.width,
    layout.isTabletLandscape,
    layoutRef,
    layoutSize,
    trayRef,
    traySize,
  ]);

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
        const sizeReader = new Image();
        sizeReader.onload = () => {
          if (isMounted) {
            setImageSize({
              width: sizeReader.naturalWidth || DEFAULT_IMAGE_SIZE.width,
              height: sizeReader.naturalHeight || DEFAULT_IMAGE_SIZE.height,
            });
          }
        };
        sizeReader.src = objectUrl;
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

  useEffect(() => {
    if (!isBoardReady || hasInitializedPieces) {
      return;
    }

    const restored = createRestoredState(puzzle, initialProgress, boardSize, trayArea);
    setPieces(restored.pieces);
    setMoveCount(restored.moves);
    setTimerBaseSeconds(restored.elapsedSeconds);
    setError((current) => current || restored.restoreError);
    setHasInitializedPieces(true);
    previousBoardSizeRef.current = boardSize;
    setPlayKey(`${puzzle.id}-${Date.now()}`);
  }, [boardSize, hasInitializedPieces, initialProgress, isBoardReady, puzzle, trayArea]);

  useEffect(() => {
    if (!isBoardReady || !hasInitializedPieces) {
      return;
    }

    const previousBoardSize = previousBoardSizeRef.current;
    if (
      !previousBoardSize ||
      (previousBoardSize.width === boardSize.width && previousBoardSize.height === boardSize.height)
    ) {
      previousBoardSizeRef.current = boardSize;
      return;
    }

    setPieces((current) =>
      scaleSavedPieces(current, puzzle.gridSize, previousBoardSize.width, previousBoardSize.height, boardSize),
    );
    previousBoardSizeRef.current = boardSize;
  }, [boardSize, hasInitializedPieces, isBoardReady, puzzle.gridSize]);

  const resetPlay = useCallback(() => {
    setPieces(createJigsawPieces(puzzle.gridSize, boardSize.width, boardSize.height, trayArea));
    setMoveCount(0);
    setTimerBaseSeconds(0);
    setHasCompletedCurrentPlay(false);
    setCompletionResult(undefined);
    setSaveMessage("");
    setPlayKey(`${puzzle.id}-${Date.now()}`);
    previousBoardSizeRef.current = boardSize;
  }, [boardSize, puzzle.gridSize, puzzle.id, trayArea]);

  const buildProgress = useCallback(
    (): SavedPuzzleProgress => ({
      id: `${puzzle.id}:jigsaw`,
      puzzleId: puzzle.id,
      mode: "jigsaw",
      status: hasCompletedCurrentPlay ? "completed" : "playing",
      savedAt: new Date().toISOString(),
      elapsedSeconds,
      moveCount,
      jigsawPieces: pieces,
      boardWidth: boardSize.width,
      boardHeight: boardSize.height,
    }),
    [boardSize, elapsedSeconds, hasCompletedCurrentPlay, moveCount, pieces, puzzle.id],
  );

  const handleSaveProgress = useCallback(async (): Promise<SavedPuzzleProgress> => {
    const progress = buildProgress();
    await savePuzzleProgress(progress);
    onProgressSaved(progress);
    setSaveMessage("ここまで保存したよ！つづきからまた遊べるよ");
    return progress;
  }, [buildProgress, onProgressSaved]);

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
    setSaveMessage("");
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
      <div className="jigsaw-play-layout" ref={layoutRef}>
        <div className="play-header jigsaw-header">
          <div>
            <span className="eyebrow">{PUZZLE_MODE_LABELS.jigsaw}</span>
            <h2>
              <span className="jigsaw-title-full">{puzzle.title}</span>
              <span className="jigsaw-title-compact">しゃしんパズル</span>
            </h2>
          </div>
        </div>

        <div className="jigsaw-status-messages">
          {saveMessage && <p className="success-message">{saveMessage}</p>}
          {error && <p className="error-message">{error}</p>}
          {puzzle.gridSize >= 6 && (
            <p className="hint-message">
              ピース数が多いので、細かい操作になります。拡大表示しながら遊ぶのがおすすめです。
            </p>
          )}
        </div>

        <div className="jigsaw-mobile-info-bar">
          <span>🏅{totalMedals}</span>
          <span>⏱{formatSeconds(elapsedSeconds)}</span>
          <span>↔{moveCount}</span>
          <button className="secondary-button reference-button" type="button" onClick={() => setIsReferenceOpen(true)}>
            見本
          </button>
        </div>

        <div className="jigsaw-board-panel" ref={boardPanelRef}>
          <div className="jigsaw-target-board" style={{ width: boardSize.width, height: boardSize.height }}>
            {imageUrl && <img src={imageUrl} alt={`${puzzle.title}の完成見本`} />}
          </div>
        </div>

        <aside className="jigsaw-side-panel">
          <section className="sample-panel">
            <span className="eyebrow">完成見本</span>
            {imageUrl ? <img className="reference-image" src={imageUrl} alt={`${puzzle.title}の完成見本`} /> : <p>読み込み中</p>}
            <p>
              {puzzle.gridSize}×{puzzle.gridSize} / {puzzle.pieceCount}ピース
            </p>
          </section>
          <div className="play-stats jigsaw-stats">
            <span>動かした回数 {moveCount}</span>
            <span>時間 {formatSeconds(elapsedSeconds)}</span>
            <span>メダル {totalMedals}枚</span>
          </div>
        </aside>

        <div className="jigsaw-piece-tray" ref={trayRef}>
          <div className="jigsaw-tray-label">ピース置き場</div>
        </div>

        <div className="play-actions jigsaw-controls">
          <button className="secondary-button" type="button" onClick={handleSaveProgress}>
            一時保存
          </button>
          <button className="secondary-button" type="button" onClick={handleRetryClick}>
            やり直し
          </button>
          <button className="secondary-button" type="button" onClick={handleBackClick}>
            <span className="jigsaw-back-full">保存して一覧に戻る</span>
            <span className="jigsaw-back-compact">保存して戻る</span>
          </button>
        </div>

        <div className="jigsaw-piece-layer" aria-hidden={!imageUrl}>
          {imageUrl &&
            pieces.map((piece) => (
              <JigsawFreePiece
                key={piece.id}
                piece={piece}
                gridSize={puzzle.gridSize}
                imageUrl={imageUrl}
                originX={boardOrigin.x}
                originY={boardOrigin.y}
                onDragStart={bringToFront}
                onDragMove={movePiece}
                onDragEnd={finishDrag}
              />
            ))}
        </div>
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

      {isReferenceOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reference-modal-title">
          <div className="reference-dialog">
            <h2 id="reference-modal-title">完成見本</h2>
            {imageUrl && <img src={imageUrl} alt={`${puzzle.title}の完成見本`} />}
            <button className="primary-button" type="button" onClick={() => setIsReferenceOpen(false)}>
              閉じる
            </button>
          </div>
        </div>
      )}

      {hasCompletedCurrentPlay && (
        <CompletionModal
          completionResult={completionResult}
          fallbackTotalMedals={totalMedals}
          elapsedSeconds={elapsedSeconds}
          moves={moveCount}
          puzzleTitle={puzzle.title}
          imageBlob={imageBlob}
          imageUrl={imageUrl}
          moveLabel="動かした回数"
          moveUnit="回"
          onReplay={resetPlay}
          onBackHome={onBackHome}
        />
      )}
    </section>
  );
}
