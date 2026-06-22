import { useCallback, useEffect, useMemo, useState } from "react";
import { AddPhotoForm } from "./components/AddPhotoForm";
import { JigsawFreePlayBoard } from "./components/JigsawFreePlayBoard";
import { MedalDisplay } from "./components/MedalDisplay";
import { PuzzleBoard } from "./components/PuzzleBoard";
import { PuzzleCard } from "./components/PuzzleCard";
import { useAppStats } from "./hooks/useAppStats";
import {
  deletePuzzleAndImages,
  deletePuzzleProgress,
  getAllPuzzleProgresses,
  getPuzzles,
  updatePuzzle,
} from "./lib/db";
import { getCurrentMedalTitle } from "./lib/medalTitles";
import type { CompletionResult, PuzzleItem, SavedPuzzleProgress } from "./types/puzzle";

type ViewState =
  | { name: "home" }
  | { name: "add" }
  | { name: "play"; puzzle: PuzzleItem; progress?: SavedPuzzleProgress };

const toProgressMap = (progresses: SavedPuzzleProgress[]): Record<string, SavedPuzzleProgress> =>
  progresses.reduce<Record<string, SavedPuzzleProgress>>((result, progress) => {
    if (progress.status === "playing") {
      result[progress.puzzleId] = progress;
    }
    return result;
  }, {});

function App() {
  const [view, setView] = useState<ViewState>({ name: "home" });
  const [puzzles, setPuzzles] = useState<PuzzleItem[]>([]);
  const [progresses, setProgresses] = useState<Record<string, SavedPuzzleProgress>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { stats, addMedal } = useAppStats();

  const progressList = useMemo(() => Object.values(progresses), [progresses]);

  const loadHomeData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [loadedPuzzles, loadedProgresses] = await Promise.all([
        getPuzzles(),
        getAllPuzzleProgresses(),
      ]);
      setPuzzles(loadedPuzzles);
      setProgresses(toProgressMap(loadedProgresses));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "保存済みパズルを読み込めませんでした。",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const handleSaved = () => {
    setMessage("写真パズルを保存しました。");
    setView({ name: "home" });
    loadHomeData();
  };

  const handleDelete = async (puzzle: PuzzleItem) => {
    if (
      !window.confirm(
        "このパズルを削除しますか？写真データと途中保存データも削除されます。",
      )
    ) {
      return;
    }

    setError("");
    try {
      await deletePuzzleAndImages(puzzle);
      setMessage("パズルを削除しました。");
      await loadHomeData();
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
      await deletePuzzleProgress(puzzle.id);
      addMedal();
      setProgresses((current) => {
        const next = { ...current };
        delete next[puzzle.id];
        return next;
      });
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
    loadHomeData();
  };

  const handleProgressSaved = (progress: SavedPuzzleProgress) => {
    setProgresses((current) => ({ ...current, [progress.puzzleId]: progress }));
    setMessage("ここまで保存したよ！つづきからまた遊べるよ");
  };

  const handleResume = (puzzle: PuzzleItem) => {
    const progress = progresses[puzzle.id];
    if (!progress) {
      setMessage("途中保存が見つからなかったので、最初から始めます。");
      setView({ name: "play", puzzle });
      return;
    }
    setView({ name: "play", puzzle, progress });
  };

  const handleStartFresh = async (puzzle: PuzzleItem) => {
    if (progresses[puzzle.id]) {
      const shouldDelete = window.confirm(
        "途中保存を消して最初から始めますか？キャンセルすると途中保存は残ります。",
      );
      if (shouldDelete) {
        await deletePuzzleProgress(puzzle.id);
        setProgresses((current) => {
          const next = { ...current };
          delete next[puzzle.id];
          return next;
        });
      }
    }
    setView({ name: "play", puzzle });
  };

  const renderHome = () => (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">ブラウザだけで遊べる</span>
          <h1>しゃしんパズルコレクション</h1>
          <p>
            その場で撮った写真や端末内の画像を、タイルパズルやジグソーパズルに変えて保存できます。
          </p>
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

        {progressList.length > 0 && (
          <p className="resume-summary">途中保存あり: {progressList.length}件</p>
        )}
        {isLoading && <p className="empty-text">読み込み中です。</p>}
        {!isLoading && puzzles.length === 0 && (
          <p className="empty-text">まだパズルがありません。まずは写真を追加しましょう。</p>
        )}
        <div className="puzzle-grid">
          {puzzles.map((puzzle) => (
            <PuzzleCard
              key={puzzle.id}
              puzzle={puzzle}
              progress={progresses[puzzle.id]}
              onResume={handleResume}
              onStartFresh={handleStartFresh}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </section>

      <section className="how-to">
        <div className="section-heading">
          <span className="eyebrow">遊び方</span>
          <h2>写真を選んで、モードを選んで、完成させよう</h2>
        </div>
        <ol>
          <li>写真を選ぶか、スマホ・タブレットのカメラで撮影します。</li>
          <li>タイルパズルかジグソーパズル、ピース数を選んで保存します。</li>
          <li>途中でやめるときは「一時保存」または「保存して一覧に戻る」を使えます。</li>
          <li>完成するとメダルを獲得し、称号に近づきます。</li>
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
            initialProgress={view.progress}
            onComplete={handleComplete}
            onBackHome={handleBackHome}
            onProgressSaved={handleProgressSaved}
          />
        ) : (
          <PuzzleBoard
            puzzle={view.puzzle}
            totalMedals={stats.totalMedals}
            initialProgress={view.progress}
            onComplete={handleComplete}
            onBackHome={handleBackHome}
            onProgressSaved={handleProgressSaved}
          />
        ))}
    </main>
  );
}

export default App;
