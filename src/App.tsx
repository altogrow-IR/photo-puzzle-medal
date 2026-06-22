import { useCallback, useEffect, useState } from "react";
import { AddPhotoForm } from "./components/AddPhotoForm";
import { JigsawFreePlayBoard } from "./components/JigsawFreePlayBoard";
import { MedalDisplay } from "./components/MedalDisplay";
import { PuzzleBoard } from "./components/PuzzleBoard";
import { PuzzleCard } from "./components/PuzzleCard";
import { useAppStats } from "./hooks/useAppStats";
import { deletePuzzleAndImages, getPuzzles, updatePuzzle } from "./lib/db";
import { getCurrentMedalTitle } from "./lib/medalTitles";
import type { CompletionResult, PuzzleItem } from "./types/puzzle";

type ViewState =
  | { name: "home" }
  | { name: "add" }
  | { name: "play"; puzzle: PuzzleItem };

function App() {
  const [view, setView] = useState<ViewState>({ name: "home" });
  const [puzzles, setPuzzles] = useState<PuzzleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { stats, addMedal } = useAppStats();

  const loadPuzzles = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setPuzzles(await getPuzzles());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "保存済みパズルを読み込めませんでした。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPuzzles();
  }, [loadPuzzles]);

  const handleSaved = () => {
    setMessage("写真パズルを保存しました。");
    setView({ name: "home" });
    loadPuzzles();
  };

  const handleDelete = async (puzzle: PuzzleItem) => {
    if (!window.confirm("このパズルを削除しますか？写真データも削除されます。")) {
      return;
    }

    setError("");
    try {
      await deletePuzzleAndImages(puzzle);
      setMessage("パズルを削除しました。");
      await loadPuzzles();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "パズルの削除に失敗しました。");
    }
  };

  const handleComplete = useCallback(
    async (puzzle: PuzzleItem): Promise<CompletionResult> => {
      const now = new Date().toISOString();
      const beforeMedals = stats.totalMedals;
      const afterMedals = beforeMedals + 1;
      const beforeTitle = getCurrentMedalTitle(beforeMedals);
      const currentTitle = getCurrentMedalTitle(afterMedals);
      const updatedPuzzle: PuzzleItem = {
        ...puzzle,
        completedCount: puzzle.completedCount + 1,
        lastPlayedAt: now,
        updatedAt: now,
      };

      await updatePuzzle(updatedPuzzle);
      addMedal();
      setPuzzles((current) => current.map((item) => (item.id === updatedPuzzle.id ? updatedPuzzle : item)));
      setView((current) => (current.name === "play" ? { name: "play", puzzle: updatedPuzzle } : current));

      return {
        totalMedals: afterMedals,
        currentTitle,
        gainedTitle: beforeTitle.id === currentTitle.id ? undefined : currentTitle,
      };
    },
    [addMedal, stats.totalMedals],
  );

  const handleBackHome = () => {
    setView({ name: "home" });
    loadPuzzles();
  };

  const renderHome = () => (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">ブラウザだけで遊べる</span>
          <h1>しゃしんパズルコレクション</h1>
          <p>その場で撮った写真や端末内の画像を、タイルパズルやジグソーパズルに変えて保存できます。</p>
        </div>
        <MedalDisplay totalMedals={stats.totalMedals} />
      </section>

      <section className="home-actions">
        <button className="primary-button add-button" type="button" onClick={() => setView({ name: "add" })}>
          写真パズルを追加
        </button>
      </section>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <section className="screen-panel">
        <div className="section-heading">
          <span className="eyebrow">保存済み</span>
          <h2>パズル一覧</h2>
        </div>

        {isLoading && <p className="empty-text">読み込み中です。</p>}
        {!isLoading && puzzles.length === 0 && (
          <p className="empty-text">まだパズルがありません。まずは写真を1枚追加しましょう。</p>
        )}
        <div className="puzzle-grid">
          {puzzles.map((puzzle) => (
            <PuzzleCard
              key={puzzle.id}
              puzzle={puzzle}
              onPlay={(item) => setView({ name: "play", puzzle: item })}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </section>

      <section className="how-to">
        <div className="section-heading">
          <span className="eyebrow">遊び方</span>
          <h2>写真を選んで、モードを選んで、完成！</h2>
        </div>
        <ol>
          <li>写真を選ぶか、スマホのカメラで撮影します。</li>
          <li>タイルパズルかジグソーパズル、ピース数を選んで保存します。</li>
          <li>タイルは入れ替え、ジグソーは自由に動かして正しい場所へはめます。</li>
          <li>完成したらメダルを1枚ゲットし、称号にも近づきます。</li>
        </ol>
      </section>
    </>
  );

  return (
    <main className="app-shell">
      {view.name === "home" && renderHome()}
      {view.name === "add" && <AddPhotoForm onSaved={handleSaved} onCancel={() => setView({ name: "home" })} />}
      {view.name === "play" &&
        (view.puzzle.mode === "jigsaw" ? (
          <JigsawFreePlayBoard
            puzzle={view.puzzle}
            totalMedals={stats.totalMedals}
            onComplete={handleComplete}
            onBackHome={handleBackHome}
          />
        ) : (
          <PuzzleBoard
            puzzle={view.puzzle}
            totalMedals={stats.totalMedals}
            onComplete={handleComplete}
            onBackHome={handleBackHome}
          />
        ))}
    </main>
  );
}

export default App;
