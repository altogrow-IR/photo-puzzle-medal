import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { saveImage, savePuzzle } from "../lib/db";
import { createId, resizeImageToBlob } from "../lib/imageUtils";
import { PUZZLE_MODE_DESCRIPTIONS, PUZZLE_MODE_LABELS } from "../lib/puzzleMode";
import type { PuzzleItem, PuzzleMode, StoredImage } from "../types/puzzle";

const GRID_OPTIONS = [3, 4, 5, 6, 8];

type AddPhotoFormProps = {
  onSaved: () => void;
  onCancel: () => void;
};

export function AddPhotoForm({ onSaved, onCancel }: AddPhotoFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [title, setTitle] = useState("");
  const [gridSize, setGridSize] = useState(4);
  const [mode, setMode] = useState<PuzzleMode>("tile");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const pieceCount = useMemo(() => gridSize * gridSize, [gridSize]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError("");

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください。");
      return;
    }

    setSelectedFile(file);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!selectedFile) {
      setError("写真を選択してください。");
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("パズル名を入力してください。");
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const imageBlob = await resizeImageToBlob(selectedFile, 1200);
      const thumbnailBlob = await resizeImageToBlob(selectedFile, 300);
      const imageId = createId();
      const thumbnailId = createId();

      const image: StoredImage = {
        id: imageId,
        blob: imageBlob,
        mimeType: imageBlob.type || "image/jpeg",
        createdAt: now,
      };

      const thumbnail: StoredImage = {
        id: thumbnailId,
        blob: thumbnailBlob,
        mimeType: thumbnailBlob.type || "image/jpeg",
        createdAt: now,
      };

      const puzzle: PuzzleItem = {
        id: createId(),
        title: trimmedTitle,
        imageId,
        thumbnailId,
        gridSize,
        pieceCount,
        mode,
        completedCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      await saveImage(image);
      await saveImage(thumbnail);
      await savePuzzle(puzzle);
      onSaved();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "写真の保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="screen-panel add-screen">
      <div className="section-heading">
        <span className="eyebrow">新しい冒険を作る</span>
        <h2>写真をパズルにする</h2>
      </div>

      <form className="add-form" onSubmit={handleSubmit}>
        <div className="file-actions">
          <label className="file-button">
            写真を選ぶ
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </label>
          <label className="file-button camera">
            カメラで撮る
            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
          </label>
        </div>

        <div className="preview-box">
          {previewUrl ? <img src={previewUrl} alt="選択した写真のプレビュー" /> : <p>写真を選ぶとここにプレビューが表示されます。</p>}
        </div>

        <label className="field">
          <span>パズル名</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={40} placeholder="例：公園で見つけた宝物" />
        </label>

        <fieldset className="piece-options">
          <legend>ピース数</legend>
          <div>
            {GRID_OPTIONS.map((size) => (
              <label key={size} className={gridSize === size ? "selected" : ""}>
                <input type="radio" name="grid-size" value={size} checked={gridSize === size} onChange={() => setGridSize(size)} />
                {size}×{size}
                <small>{size * size}ピース</small>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="piece-options mode-options">
          <legend>パズルモード</legend>
          <div>
            {(["tile", "jigsaw"] as PuzzleMode[]).map((option) => (
              <label key={option} className={mode === option ? "selected" : ""}>
                <input
                  type="radio"
                  name="puzzle-mode"
                  value={option}
                  checked={mode === option}
                  onChange={() => setMode(option)}
                />
                {PUZZLE_MODE_LABELS[option]}
                <small>{PUZZLE_MODE_DESCRIPTIONS[option]}</small>
              </label>
            ))}
          </div>
          {mode === "jigsaw" && gridSize >= 6 && (
            <p className="hint-message">
              ジグソーパズルモードでは、ピース数が多いとスマホで操作しづらくなる場合があります。はじめは3×3または4×4がおすすめです。
            </p>
          )}
        </fieldset>

        {error && <p className="error-message">{error}</p>}

        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? "保存中..." : `${pieceCount}ピースで保存`}
          </button>
          <button className="secondary-button" type="button" onClick={onCancel} disabled={isSaving}>
            キャンセル
          </button>
        </div>
      </form>
    </section>
  );
}
