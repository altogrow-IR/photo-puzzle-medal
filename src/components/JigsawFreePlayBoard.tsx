import { useCallback, useEffect, useRef, useState } from "react";
import { getImage } from "../lib/db";
import { resizeImageToBlob } from "../lib/imageUtils";
import { createJigsawPieces, restoreJigsawTray, getDistance, SNAP_THRESHOLD_DESKTOP, SNAP_THRESHOLD_TOUCH } from "../lib/jigsawUtils";
import { loadProgress, saveProgress, clearProgress } from "../lib/progress";
import { usePuzzleTimer } from "../hooks/usePuzzleTimer";
import type { CompletionResult, JigsawPieceState, PuzzleItem } from "../types/puzzle";
import { CompletionModal } from "./CompletionModal";
import { JigsawFreePiece } from "./JigsawFreePiece";

// Logical coordinates stay fixed so a resize never changes the saved game.
const SIZE = 600;
type Props = { puzzle: PuzzleItem; totalMedals: number; onComplete: (puzzle: PuzzleItem) => Promise<CompletionResult>; onBackHome: () => void };
export function JigsawFreePlayBoard({ puzzle, totalMedals, onComplete, onBackHome }: Props) {
 const stageRef = useRef<HTMLDivElement>(null);
 const [saved, setSaved] = useState(() => loadProgress(puzzle));
 const [pieces, setPieces] = useState<JigsawPieceState[]>(() => saved ? restoreJigsawTray(saved.pieces as JigsawPieceState[]) : createJigsawPieces(puzzle.gridSize, SIZE, SIZE + 34));
 const [width, setWidth] = useState(300);
 const [imageUrl, setImageUrl] = useState("");
 const [moves, setMoves] = useState(saved?.moves ?? 0);
 const [selected, setSelected] = useState<string | null>(null);
 const [playKey, setPlayKey] = useState("initial");
 const [completed, setCompleted] = useState(false);
 const [result, setResult] = useState<CompletionResult>();
 const [error, setError] = useState("");
 const [saveFailed, setSaveFailed] = useState(false);
 const skipTrayClick = useRef(false);
 const dragStart = useRef<{ x: number; y: number } | null>(null);
 const elapsed = usePuzzleTimer(!completed && !!imageUrl, playKey, saved?.seconds ?? 0);
 const remaining = pieces.filter(p => !p.isSnapped);
 useEffect(() => {
  const element = stageRef.current;
  if (!element) return;
  const observer = new ResizeObserver(() => setWidth(element.clientWidth));
  observer.observe(element); setWidth(element.clientWidth);
  return () => observer.disconnect();
 }, []);
 useEffect(() => {
  let active = true; let url = "";
  getImage(puzzle.imageId).then(async image => {
   if (!image) throw new Error("写真データが見つかりません。一覧から写真を登録し直してください。");
   const blob = await resizeImageToBlob(image.blob, 1200);
   if (active) { url = URL.createObjectURL(blob); setImageUrl(url); }
  }).catch(() => { if (active) setError("写真を読み込めません。一覧に戻ってお試しください。"); });
  return () => { active = false; if (url) URL.revokeObjectURL(url); };
 }, [puzzle.imageId]);
 useEffect(() => {
  if (!completed) setSaveFailed(!saveProgress(puzzle, pieces, elapsed, moves));
 }, [puzzle, pieces, elapsed, moves, completed]);
 const reset = useCallback(() => {
  clearProgress(puzzle.id); setSaved(undefined);
  setPieces(createJigsawPieces(puzzle.gridSize, SIZE, SIZE + 34));
  setMoves(0); setCompleted(false); setResult(undefined); setSelected(null); setError(""); setPlayKey(String(Date.now()));
 }, [puzzle.id, puzzle.gridSize]);
 const move = (id: string, x: number, y: number) => setPieces(current => current.map(p => p.id === id && !p.isSnapped ? { ...p, x: Math.max(0, Math.min(SIZE - p.width, x)), y: Math.max(0, Math.min(SIZE - p.height, y)) } : p));
 const finish = (id: string, pointerType: string) => {
  setMoves(n => n + 1);
  // Thresholds represent screen pixels, capped to avoid neighboring-cell snaps.
  const tolerance = Math.min((pointerType === "touch" ? SNAP_THRESHOLD_TOUCH : SNAP_THRESHOLD_DESKTOP) * SIZE / width, SIZE / puzzle.gridSize * .45);
  setPieces(current => current.map(p => p.id === id && !p.isSnapped && getDistance(p.x, p.y, p.targetX, p.targetY) <= tolerance ? { ...p, x:p.targetX, y:p.targetY, isSnapped:true } : p));
  setSelected(null);
 };
 const place = (id: string, clientX: number, clientY: number, pointerType: string) => {
  const rect = stageRef.current?.getBoundingClientRect();
  const piece = pieces.find(p => p.id === id);
  if (!rect || !piece || piece.isSnapped || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return false;
  move(id, (clientX - rect.left) * SIZE / rect.width - piece.width / 2, (clientY - rect.top) * SIZE / rect.height - piece.height / 2);
  finish(id, pointerType); return true;
 };
 useEffect(() => {
  if (!imageUrl || completed || !pieces.every(p => p.isSnapped)) return;
  clearProgress(puzzle.id); setCompleted(true);
  onComplete(puzzle).then(setResult).catch(() => setError("完成記録を保存できませんでした。"));
 }, [imageUrl, completed, pieces, puzzle, onComplete]);
 return <section className="play-screen jigsaw-screen">
  <header className="play-header"><div><span className="eyebrow">ジグソーパズル</span><h2>{puzzle.title}</h2></div>
   <div className="play-actions"><button className="secondary-button" onClick={() => { if (window.confirm("途中の状態を消してやり直しますか？")) reset(); }}>やり直し</button><button className="secondary-button" onClick={onBackHome}>一覧に戻る</button></div>
  </header>
  <div className="jigsaw-layout"><div className="jigsaw-main">
   <div className="play-stats"><span>あと{remaining.length}ピース</span><span>{Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,"0")}</span><span>{moves}回</span></div>
   <div className="jigsaw-feedback">{error && <p className="error-message">{error}</p>}{saveFailed && <p className="error-message">途中保存できません。この画面を閉じると進捗が失われます。</p>}
   <p className="operation-hint">{selected ? "置く場所をタップしてください" : "ピースを選んで盤面をタップ。ドラッグでも置けます。"}</p>
   </div>
   <div className="jigsaw-stage" ref={stageRef} onClick={e => { if (selected && !completed) place(selected, e.clientX, e.clientY, "touch"); }}>
    <div className="jigsaw-logical" style={{ width:SIZE, height:SIZE, transform:`scale(${width/SIZE})` }}>
     <div className="jigsaw-target-board" style={{width:SIZE,height:SIZE}}>{imageUrl && <img src={imageUrl} alt="完成見本"/>}</div>
     {imageUrl && pieces.filter(p => p.y < SIZE).map(piece => <JigsawFreePiece key={piece.id} piece={piece} gridSize={puzzle.gridSize} imageUrl={imageUrl} scale={width/SIZE} onDragStart={id => { setSelected(null); setPieces(current => current.map(p => p.id===id ? {...p,zIndex:Math.max(...current.map(q=>q.zIndex))+1}:p)); }} onDragMove={move} onDragEnd={finish}/>) }
    </div>
   </div>
   <div className="jigsaw-tools"><div className="tray-heading"><strong>ピース置き場</strong><button className="secondary-button" onClick={() => { setSelected(null); setPieces(current => current.map(p => p.isSnapped ? p : {...p,x:0,y:SIZE+34})); }}>残りを整頓</button></div>
   <div className="piece-tray" aria-label="残りのピース">{imageUrl && remaining.map(p => <button key={p.id} className={`tray-piece ${selected===p.id ? "selected" : ""}`} aria-label={`ピース${p.correctIndex+1}を選ぶ`} aria-pressed={selected===p.id} style={{backgroundImage:`url(${imageUrl})`,backgroundSize:`${puzzle.gridSize*100}% ${puzzle.gridSize*100}%`,backgroundPosition:`${p.col/(puzzle.gridSize-1)*100}% ${p.row/(puzzle.gridSize-1)*100}%`}}
    onClick={() => { if (skipTrayClick.current) { skipTrayClick.current=false; return; } setSelected(p.id); }} onPointerMove={e => { const start=dragStart.current; if(e.pointerType!=="mouse" || !start || Math.hypot(e.clientX-start.x,e.clientY-start.y)<8) return; const rect=stageRef.current?.getBoundingClientRect(); if(rect && e.clientX>=rect.left && e.clientX<=rect.right && e.clientY>=rect.top && e.clientY<=rect.bottom) move(p.id, (e.clientX-rect.left)*SIZE/rect.width-p.width/2, (e.clientY-rect.top)*SIZE/rect.height-p.height/2); }} onPointerCancel={() => {dragStart.current=null;}} onPointerDown={e => { dragStart.current={x:e.clientX,y:e.clientY}; if(e.pointerType==='mouse') e.currentTarget.setPointerCapture(e.pointerId); }} onPointerUp={e => { const start=dragStart.current; dragStart.current=null; if(start && Math.hypot(e.clientX-start.x,e.clientY-start.y)>8 && place(p.id,e.clientX,e.clientY,e.pointerType)) { skipTrayClick.current=true; e.preventDefault(); } }} />)}</div>
   </div>
  </div><aside className="sample-panel"><span className="eyebrow">完成見本</span>{imageUrl && <img src={imageUrl} alt={`${puzzle.title}の完成見本`}/>}<p>{puzzle.pieceCount}ピース</p></aside></div>
  {completed && <CompletionModal completionResult={result} fallbackTotalMedals={totalMedals} elapsedSeconds={elapsed} moves={moves} moveLabel="動かした回数" moveUnit="回" onReplay={reset} onBackHome={onBackHome}/>}
 </section>;
}
