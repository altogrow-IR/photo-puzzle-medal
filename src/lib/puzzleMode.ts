import type { PuzzleMode } from "../types/puzzle";

export const PUZZLE_MODE_LABELS: Record<PuzzleMode, string> = {
  tile: "タイルパズル",
  jigsaw: "ジグソーパズル",
};

export const PUZZLE_MODE_DESCRIPTIONS: Record<PuzzleMode, string> = {
  tile: "四角いピースを入れ替えて完成させるパズル",
  jigsaw: "ピースを自由に動かして、正しい場所にはめるパズル",
};
