import { useEffect, useState } from "react";
import { loadProgress } from "../lib/progress";
import { resizeImageToBlob } from "../lib/imageUtils";
import { getImage } from "../lib/db";
import { PUZZLE_MODE_LABELS } from "../lib/puzzleMode";
import type { PuzzleItem } from "../types/puzzle";

type PuzzleCardProps = {
  puzzle: PuzzleItem;
  onPlay: (puzzle: PuzzleItem) => void;
  onDelete: (puzzle: PuzzleItem) => void;
};

const formatDate = (dateText?: string): string => {
  if (!dateText) {
    return "まだ遊んでいません";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateText));
};

export function PuzzleCard({ puzzle, onPlay, onDelete }: PuzzleCardProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    let objectUrl = "";

    getImage(puzzle.thumbnailId)
      .then(async (image) => {
        if (!isMounted || !image) {
          return;
        }
        const blob = await resizeImageToBlob(image.blob, 1200);
        if (!isMounted) return;
        objectUrl = URL.createObjectURL(blob);
        setThumbnailUrl(objectUrl);
      })
      .catch(() => {
        if (isMounted) {
          setError("サムネイルを表示できません。");
        }
      });

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [puzzle.thumbnailId]);

  return (
    <article className="puzzle-card">
      <div className="thumbnail-frame">
        {thumbnailUrl ? <img src={thumbnailUrl} alt={`${puzzle.title}のサムネイル`} /> : <span>{error || "読み込み中"}</span>}
      </div>
      <div className="puzzle-card-body">
        <h3>{puzzle.title}</h3>
        <dl className="puzzle-meta">
          <div>
            <dt>ピース</dt>
            <dd>
              {puzzle.gridSize}×{puzzle.gridSize} / {puzzle.pieceCount}
            </dd>
          </div>
          <div>
            <dt>モード</dt>
            <dd>{PUZZLE_MODE_LABELS[puzzle.mode]}</dd>
          </div>
          <div>
            <dt>完成</dt>
            <dd>{puzzle.completedCount}回</dd>
          </div>
          <div>
            <dt>最後</dt>
            <dd>{formatDate(puzzle.lastPlayedAt)}</dd>
          </div>
        </dl>
      </div>
      <div className="card-actions">
        <button className="primary-button" type="button" onClick={() => onPlay(puzzle)}>
          {loadProgress(puzzle) ? "つづきから" : "遊ぶ"}
        </button>
        <details className="management-menu"><summary aria-label={`${puzzle.title}の管理`}>管理 ⋯</summary>
        <button className="danger-button" type="button" onClick={() => onDelete(puzzle)}>
          このパズルを削除
        </button></details>
      </div>
    </article>
  );
}
