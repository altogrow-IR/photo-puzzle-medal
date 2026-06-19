import type { MedalTitle } from "../types/puzzle";

export const MEDAL_TITLES: MedalTitle[] = [
  {
    id: "start",
    name: "パズルはじめました",
    requiredMedals: 0,
    description: "はじめての一歩。",
  },
  {
    id: "apprentice",
    name: "パズル見習い",
    requiredMedals: 3,
    description: "少しずつコツをつかんできた証。",
  },
  {
    id: "collector",
    name: "しゃしんコレクター",
    requiredMedals: 10,
    description: "たくさんの写真で遊んだ証。",
  },
  {
    id: "expert",
    name: "パズル名人",
    requiredMedals: 20,
    description: "どんな写真でも解ける実力者。",
  },
  {
    id: "master",
    name: "パズルマスター",
    requiredMedals: 30,
    description: "パズルの楽しさを極めてきた証。",
  },
  {
    id: "legend",
    name: "伝説のパズル勇者",
    requiredMedals: 50,
    description: "写真パズルを極めし者。",
  },
];

export const getCurrentMedalTitle = (totalMedals: number): MedalTitle =>
  MEDAL_TITLES.filter((title) => totalMedals >= title.requiredMedals).sort(
    (a, b) => b.requiredMedals - a.requiredMedals,
  )[0];

export const getNextMedalTitle = (totalMedals: number): MedalTitle | undefined =>
  MEDAL_TITLES.filter((title) => totalMedals < title.requiredMedals).sort(
    (a, b) => a.requiredMedals - b.requiredMedals,
  )[0];
