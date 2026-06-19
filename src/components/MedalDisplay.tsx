import { getCurrentMedalTitle, getNextMedalTitle } from "../lib/medalTitles";

type MedalDisplayProps = {
  totalMedals: number;
};

export function MedalDisplay({ totalMedals }: MedalDisplayProps) {
  const currentTitle = getCurrentMedalTitle(totalMedals);
  const nextTitle = getNextMedalTitle(totalMedals);

  return (
    <div className="medal-display" aria-label={`合計メダル数 ${totalMedals}枚`}>
      <span className="medal-icon">🏅</span>
      <div className="medal-content">
        <span className="eyebrow">合計メダル</span>
        <strong>{totalMedals}枚</strong>
        <div className="title-badge">
          <span>現在の称号</span>
          <b>{currentTitle.name}</b>
        </div>
        {nextTitle && (
          <span className="next-title">
            あと{nextTitle.requiredMedals - totalMedals}枚で「{nextTitle.name}」
          </span>
        )}
      </div>
    </div>
  );
}
