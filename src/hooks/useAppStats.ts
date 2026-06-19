import { useCallback, useEffect, useState } from "react";
import type { AppStats } from "../types/puzzle";
import { loadAppStats, saveAppStats } from "../lib/storage";

export const useAppStats = () => {
  const [stats, setStats] = useState<AppStats>(() => loadAppStats());

  useEffect(() => {
    try {
      saveAppStats(stats);
    } catch {
      // localStorageが使えない環境でも、画面上の操作は続けられるようにします。
    }
  }, [stats]);

  const addMedal = useCallback(() => {
    setStats((current) => ({
      totalMedals: current.totalMedals + 1,
      totalCompleted: current.totalCompleted + 1,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  return { stats, addMedal };
};
