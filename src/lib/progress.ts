import type { PuzzleItem, PuzzlePiece, JigsawPieceState } from "../types/puzzle";
export type PlayProgress = { version: 1; mode: PuzzleItem["mode"]; gridSize: number; seconds: number; moves: number; pieces: PuzzlePiece[] | JigsawPieceState[] };
const key = (id: string) => "photo-puzzle-medal:progress:" + id;
export function loadProgress(puzzle: PuzzleItem): PlayProgress | undefined {
 try {
 const v = JSON.parse(localStorage.getItem(key(puzzle.id)) || "null") as PlayProgress | null;
 if (!v || v.version !== 1 || v.mode !== puzzle.mode || v.gridSize !== puzzle.gridSize || !Number.isInteger(v.seconds) || v.seconds < 0 || !Number.isInteger(v.moves) || v.moves < 0 || !Array.isArray(v.pieces) || v.pieces.length !== puzzle.pieceCount) return;
 if (v.pieces.some(p => typeof p.id !== "string" || p.id !== (v.mode === "tile" ? "piece-" : "jigsaw-") + p.correctIndex || p.row !== Math.floor(p.correctIndex / puzzle.gridSize) || p.col !== p.correctIndex % puzzle.gridSize)) return;
 const indices = v.pieces.map(p => p.correctIndex);
 if (new Set(indices).size !== puzzle.pieceCount || indices.some(i => !Number.isInteger(i) || i < 0 || i >= puzzle.pieceCount)) return;
 if (v.mode === "tile") { const pos = (v.pieces as PuzzlePiece[]).map(p => p.currentIndex); if (new Set(pos).size !== puzzle.pieceCount || pos.some(i => !Number.isInteger(i) || i < 0 || i >= puzzle.pieceCount)) return; }
 else if ((v.pieces as JigsawPieceState[]).some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y) || !p.shape || typeof p.isSnapped !== "boolean" || p.width !== 600/puzzle.gridSize || p.height !== 600/puzzle.gridSize || p.targetX !== p.col*p.width || p.targetY !== p.row*p.height || !Number.isFinite(p.zIndex) || Object.values(p.shape).length !== 4 || Object.values(p.shape).some(e => !["flat","tab","blank"].includes(e)))) return;
 return v;
 } catch { return; }
}
export function saveProgress(puzzle: PuzzleItem, pieces: PlayProgress["pieces"], seconds: number, moves: number) {
 try { localStorage.setItem(key(puzzle.id), JSON.stringify({version:1, mode:puzzle.mode, gridSize:puzzle.gridSize, pieces, seconds, moves})); return true; } catch { return false; }
}
export function clearProgress(id: string) { try { localStorage.removeItem(key(id)); } catch {} }
