import type { CSSProperties } from "react";
import type { CompletionResult } from "../types/puzzle";

type CompletionModalProps = {
  completionResult?: CompletionResult;
  fallbackTotalMedals: number;
  elapsedSeconds: number;
  moves: number;
  moveLabel?: string;
  moveUnit?: string;
  onReplay: () => void;
  onBackHome: () => void;
};

const formatSeconds = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return `${minutes}:${restSeconds.toString().padStart(2, "0")}`;
};

export function CompletionModal({
  completionResult,
  fallbackTotalMedals,
  elapsedSeconds,
  moves,
  moveLabel = "手数",
  moveUnit = "手",
  onReplay,
  onBackHome,
}: CompletionModalProps) {
  const totalMedals = completionResult?.totalMedals ?? fallbackTotalMedals;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="completion-title">
      <div className="sparkles" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <span key={index} style={{ "--i": index } as CSSProperties} />
        ))}
      </div>
      <div className="completion-modal">
        <span className="big-medal">🏅</span>
        <h2 id="completion-title">完成！</h2>
        <p>メダルを1枚ゲット！</p>
        {completionResult?.currentTitle && (
          <p className="title-message">
            現在の称号: <strong>{completionResult.currentTitle.name}</strong>
          </p>
        )}
        {completionResult?.gainedTitle && (
          <p className="new-title-message">新しい称号「{completionResult.gainedTitle.name}」を獲得！</p>
        )}
        <dl className="result-stats">
          <div>
            <dt>合計メダル</dt>
            <dd>{totalMedals}枚</dd>
          </div>
          <div>
            <dt>時間</dt>
            <dd>{formatSeconds(elapsedSeconds)}</dd>
          </div>
          <div>
            <dt>{moveLabel}</dt>
            <dd>
              {moves}{moveUnit}
            </dd>
          </div>
        </dl>
        <div className="modal-actions">
          <button className="primary-button" type="button" onClick={onReplay}>
            もう一度遊ぶ
          </button>
          <button className="secondary-button" type="button" onClick={onBackHome}>
            一覧に戻る
          </button>
        </div>
      </div>
    </div>
  );
}
