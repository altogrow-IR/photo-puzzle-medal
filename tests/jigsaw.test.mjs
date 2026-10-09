import test from 'node:test';
import assert from 'node:assert/strict';
import { createJigsawPieces, shuffleJigsawTray, restoreJigsawTray } from '../src/lib/jigsawUtils.ts';

test('new games have all pieces in shuffled tray order for every grid size', () => {
  for (const size of [3, 4, 5, 6, 8]) {
    const pieces = createJigsawPieces(size, 600, 634);
    assert.equal(pieces.length, size * size);
    assert.equal(new Set(pieces.map(p => p.id)).size, size * size);
    assert(pieces.some((p, i) => p.correctIndex !== i));
    for (const p of pieces) {
      assert.equal(p.targetX, p.col * p.width);
      assert.equal(p.targetY, p.row * p.height);
    }
  }
});

test('even a random result in answer order is corrected without altering pieces', () => {
  const original = createJigsawPieces(3, 600, 634).sort((a, b) => a.correctIndex - b.correctIndex);
  const random = Math.random;
  try {
    Math.random = () => .999999;
    const shuffled = shuffleJigsawTray(original);
    assert(shuffled.some((p, i) => p.correctIndex !== i));
    assert.deepEqual([...shuffled].sort((a, b) => a.correctIndex - b.correctIndex), original);
  } finally { Math.random = random; }
});

test('old saves migrate the tray order while preserving progress; new saves retain order', () => {
  const old = createJigsawPieces(3, 600, 634).sort((a, b) => a.correctIndex - b.correctIndex);
  old[0] = { ...old[0], x: 0, y: 0, isSnapped: true };
  const migrated = restoreJigsawTray(old);
  assert(migrated.some((p, i) => p.correctIndex !== i));
  assert.deepEqual(migrated.find(p => p.correctIndex === 0), old[0]);
  assert.equal(restoreJigsawTray(migrated), migrated);
});
