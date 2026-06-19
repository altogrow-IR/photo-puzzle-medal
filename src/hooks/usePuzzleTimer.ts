import { useEffect, useState } from "react";

export const usePuzzleTimer = (isRunning: boolean, resetKey: string): number => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setSeconds(0);
  }, [resetKey]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRunning, resetKey]);

  return seconds;
};
