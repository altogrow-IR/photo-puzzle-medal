import { useEffect, useState } from "react";

export type ResponsiveLayout = {
  isTablet: boolean;
  isLandscape: boolean;
  isTabletLandscape: boolean;
  isTabletPortrait: boolean;
};

const readLayout = (): ResponsiveLayout => {
  const isTablet = window.matchMedia("(min-width: 768px)").matches;
  const isLandscape = window.matchMedia("(orientation: landscape)").matches;

  return {
    isTablet,
    isLandscape,
    isTabletLandscape: isTablet && isLandscape,
    isTabletPortrait: isTablet && !isLandscape,
  };
};

export const useResponsiveLayout = (): ResponsiveLayout => {
  const [layout, setLayout] = useState<ResponsiveLayout>(() => readLayout());

  useEffect(() => {
    const updateLayout = () => setLayout(readLayout());
    const tabletQuery = window.matchMedia("(min-width: 768px)");
    const landscapeQuery = window.matchMedia("(orientation: landscape)");

    tabletQuery.addEventListener("change", updateLayout);
    landscapeQuery.addEventListener("change", updateLayout);
    window.addEventListener("resize", updateLayout);

    return () => {
      tabletQuery.removeEventListener("change", updateLayout);
      landscapeQuery.removeEventListener("change", updateLayout);
      window.removeEventListener("resize", updateLayout);
    };
  }, []);

  return layout;
};
