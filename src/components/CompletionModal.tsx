import { useMemo, useState } from "react";
import { createCompletionImageBlob } from "../lib/completionImage";
import { downloadBlob } from "../lib/download";
import type { CompletionResult } from "../types/puzzle";

type CompletionModalProps = {
  completionResult?: CompletionResult;
  fallbackTotalMedals: number;
  elapsedSeconds: number;
  moves: number;
  puzzleTitle: string;
  imageBlob?: Blob;
  imageUrl: string;
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

const sanitizeFilename = (value: string): string =>
  value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_").slice(0, 48) || "photo-puzzle";

export function CompletionModal({
  completionResult,
  fallbackTotalMedals,
  elapsedSeconds,
  moves,
  puzzleTitle,
  imageBlob,
  imageUrl,
  moveLabel = "手数",
  moveUnit = "手",
  onReplay,
  onBackHome,
}: CompletionModalProps) {
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [saveError, setSaveError] = useState("");
  const completedAt = useMemo(() => new Date().toISOString(), []);
  const totalMedals = completionResult?.totalMedals ?? fallbackTotalMedals;
  const currentTitleName = completionResult?.currentTitle.name ?? "見習いパズル勇者";

  const handleDownloadImage = async () => {
    if (!imageBlob) {
      setSaveError("完成画像の元データを読み込めませんでした。");
      return;
    }

    setSaveError("");
    setIsSavingImage(true);
    try {
      const blob = await createCompletionImageBlob({
        title: puzzleTitle,
        completedAt,
        totalMedals,
        currentTitleName,
        imageBlob,
      });
      downloadBlob(blob, `${sanitizeFilename(puzzleTitle)}-completed.png`);
    } catch (caughtError) {
      setSaveError(
        caughtError instanceof Error ? caughtError.message : "完成画像の保存に失敗しました。",
      );
    } finally {
      setIsSavingImage(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="completion-title">
      <div className="completion-modal">
        <div className="completion-modal-grid">
          <div className="completion-image-preview">
            {imageUrl ? <img src={imageUrl} alt={`${puzzleTitle}の完成写真`} /> : <span>完成写真</span>}
          </div>
          <div className="completion-details">
            <span className="big-medal" aria-hidden="true">MEDAL</span>
            <h2 id="completion-title">完成！</h2>
            <p>メダルを1枚ゲット</p>
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
                <dt>経過時間</dt>
                <dd>{formatSeconds(elapsedSeconds)}</dd>
              </div>
              <div>
                <dt>{moveLabel}</dt>
                <dd>
                  {moves}{moveUnit}
                </dd>
              </div>
            </dl>
            {saveError && <p className="error-message">{saveError}</p>}
            <div className="modal-actions">
              <button className="primary-button" type="button" onClick={handleDownloadImage} disabled={isSavingImage}>
                {isSavingImage ? "作成中..." : "画像として保存"}
              </button>
              <button className="secondary-button" type="button" onClick={onReplay}>
                もう一度遊ぶ
              </button>
              <button className="secondary-button" type="button" onClick={onBackHome}>
                一覧に戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
