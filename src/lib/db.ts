import type { PuzzleItem, SavedPuzzleProgress, StoredImage } from "../types/puzzle";

const DB_NAME = "photo-puzzle-medal-db";
const DB_VERSION = 2;
const PUZZLE_STORE = "puzzles";
const IMAGE_STORE = "images";
const PROGRESS_STORE = "progresses";

export const normalizePuzzleItem = (puzzle: Partial<PuzzleItem>): PuzzleItem => {
  const gridSize = puzzle.gridSize ?? 3;
  const now = new Date().toISOString();

  return {
    id: puzzle.id ?? crypto.randomUUID(),
    title: puzzle.title ?? "なまえなしパズル",
    imageId: puzzle.imageId ?? "",
    thumbnailId: puzzle.thumbnailId ?? "",
    gridSize,
    pieceCount: puzzle.pieceCount ?? gridSize * gridSize,
    mode: puzzle.mode ?? "tile",
    completedCount: puzzle.completedCount ?? 0,
    createdAt: puzzle.createdAt ?? now,
    updatedAt: puzzle.updatedAt ?? now,
    lastPlayedAt: puzzle.lastPlayedAt,
  };
};

const assertIndexedDB = (): void => {
  if (!("indexedDB" in window)) {
    throw new Error("このブラウザではIndexedDBが利用できません。別のブラウザでお試しください。");
  }
};

export const openPuzzleDb = (): Promise<IDBDatabase> => {
  assertIndexedDB();

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(PUZZLE_STORE)) {
        const puzzleStore = db.createObjectStore(PUZZLE_STORE, { keyPath: "id" });
        puzzleStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(IMAGE_STORE)) {
        db.createObjectStore(IMAGE_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
        const progressStore = db.createObjectStore(PROGRESS_STORE, { keyPath: "puzzleId" });
        progressStore.createIndex("savedAt", "savedAt", { unique: false });
      }
    };

    request.onerror = () => reject(request.error ?? new Error("IndexedDBの初期化に失敗しました。"));
    request.onsuccess = () => resolve(request.result);
  });
};

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error("IndexedDB操作に失敗しました。"));
    request.onsuccess = () => resolve(request.result);
  });

const transactionDone = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDBの保存処理に失敗しました。"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDBの保存処理が中断されました。"));
  });

export const getPuzzles = async (): Promise<PuzzleItem[]> => {
  const db = await openPuzzleDb();
  try {
    const tx = db.transaction(PUZZLE_STORE, "readonly");
    const request = tx.objectStore(PUZZLE_STORE).getAll();
    const puzzles = await requestToPromise<Partial<PuzzleItem>[]>(request);
    return puzzles.map(normalizePuzzleItem).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } finally {
    db.close();
  }
};

export const savePuzzle = async (puzzle: PuzzleItem): Promise<void> => {
  const db = await openPuzzleDb();
  try {
    const tx = db.transaction(PUZZLE_STORE, "readwrite");
    tx.objectStore(PUZZLE_STORE).put(puzzle);
    await transactionDone(tx);
  } finally {
    db.close();
  }
};

export const updatePuzzle = savePuzzle;

export const deletePuzzleAndImages = async (puzzle: PuzzleItem): Promise<void> => {
  const db = await openPuzzleDb();
  try {
    const tx = db.transaction([PUZZLE_STORE, IMAGE_STORE, PROGRESS_STORE], "readwrite");
    tx.objectStore(PUZZLE_STORE).delete(puzzle.id);
    const imageStore = tx.objectStore(IMAGE_STORE);
    imageStore.delete(puzzle.imageId);
    imageStore.delete(puzzle.thumbnailId);
    tx.objectStore(PROGRESS_STORE).delete(puzzle.id);
    await transactionDone(tx);
  } finally {
    db.close();
  }
};

export const saveImage = async (image: StoredImage): Promise<void> => {
  const db = await openPuzzleDb();
  try {
    const tx = db.transaction(IMAGE_STORE, "readwrite");
    tx.objectStore(IMAGE_STORE).put(image);
    await transactionDone(tx);
  } finally {
    db.close();
  }
};

export const getImage = async (id: string): Promise<StoredImage | undefined> => {
  const db = await openPuzzleDb();
  try {
    const tx = db.transaction(IMAGE_STORE, "readonly");
    return await requestToPromise<StoredImage | undefined>(tx.objectStore(IMAGE_STORE).get(id));
  } finally {
    db.close();
  }
};

export const deleteImage = async (id: string): Promise<void> => {
  const db = await openPuzzleDb();
  try {
    const tx = db.transaction(IMAGE_STORE, "readwrite");
    tx.objectStore(IMAGE_STORE).delete(id);
    await transactionDone(tx);
  } finally {
    db.close();
  }
};

export const savePuzzleProgress = async (progress: SavedPuzzleProgress): Promise<void> => {
  const db = await openPuzzleDb();
  try {
    const tx = db.transaction(PROGRESS_STORE, "readwrite");
    tx.objectStore(PROGRESS_STORE).put(progress);
    await transactionDone(tx);
  } finally {
    db.close();
  }
};

export const getPuzzleProgress = async (
  puzzleId: string,
): Promise<SavedPuzzleProgress | undefined> => {
  const db = await openPuzzleDb();
  try {
    const tx = db.transaction(PROGRESS_STORE, "readonly");
    return await requestToPromise<SavedPuzzleProgress | undefined>(
      tx.objectStore(PROGRESS_STORE).get(puzzleId),
    );
  } finally {
    db.close();
  }
};

export const deletePuzzleProgress = async (puzzleId: string): Promise<void> => {
  const db = await openPuzzleDb();
  try {
    const tx = db.transaction(PROGRESS_STORE, "readwrite");
    tx.objectStore(PROGRESS_STORE).delete(puzzleId);
    await transactionDone(tx);
  } finally {
    db.close();
  }
};

export const getAllPuzzleProgresses = async (): Promise<SavedPuzzleProgress[]> => {
  const db = await openPuzzleDb();
  try {
    const tx = db.transaction(PROGRESS_STORE, "readonly");
    return await requestToPromise<SavedPuzzleProgress[]>(
      tx.objectStore(PROGRESS_STORE).getAll(),
    );
  } finally {
    db.close();
  }
};
