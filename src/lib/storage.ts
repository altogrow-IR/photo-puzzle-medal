import type { AppStats } from "../types/puzzle";

export const APP_STATS_STORAGE_KEY = "photo-puzzle-medal:app-stats";

const createInitialStats = (): AppStats => ({
  totalMedals: 0,
  totalCompleted: 0,
  updatedAt: new Date().toISOString(),
});

export const loadAppStats = (): AppStats => {
  try {
    const raw = localStorage.getItem(APP_STATS_STORAGE_KEY);
    if (!raw) {
      return createInitialStats();
    }

    const parsed = JSON.parse(raw) as Partial<AppStats>;
    return {
      totalMedals: Number.isFinite(parsed.totalMedals) ? Number(parsed.totalMedals) : 0,
      totalCompleted: Number.isFinite(parsed.totalCompleted) ? Number(parsed.totalCompleted) : 0,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return createInitialStats();
  }
};

export const saveAppStats = (stats: AppStats): void => {
  localStorage.setItem(APP_STATS_STORAGE_KEY, JSON.stringify(stats));
};
