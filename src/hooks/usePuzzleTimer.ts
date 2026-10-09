import { useEffect, useState } from "react";

export const usePuzzleTimer = (isRunning: boolean, resetKey: string, initialSeconds = 0): number => {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [resetKey, initialSeconds]);

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
