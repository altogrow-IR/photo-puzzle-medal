export type PlatformInfo = {
  isAndroid: boolean;
  isStandalone: boolean;
  isTouchDevice: boolean;
};

export const getPlatformInfo = (): PlatformInfo => {
  const userAgent = navigator.userAgent.toLowerCase();

  return {
    isAndroid: userAgent.includes("android"),
    isStandalone:
      window.matchMedia("(display-mode: standalone)").matches ||
      "standalone" in navigator,
    isTouchDevice: navigator.maxTouchPoints > 0,
  };
};
