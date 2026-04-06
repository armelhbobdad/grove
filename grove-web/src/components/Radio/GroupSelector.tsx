import type { GroupSnapshot } from "../../data/types";

interface GroupSelectorProps {
  groups: GroupSnapshot[];
  currentGroupId: string | null;
  onSwitch: (groupId: string) => void;
}

export default function GroupSelector({
  groups,
  currentGroupId,
  onSwitch,
}: GroupSelectorProps) {
  const currentIndex = groups.findIndex((g) => g.id === currentGroupId);

  const handlePrev = () => {
    if (groups.length === 0) return;
    const prevIndex =
      currentIndex <= 0 ? groups.length - 1 : currentIndex - 1;
    onSwitch(groups[prevIndex].id);
  };

  const handleNext = () => {
    if (groups.length === 0) return;
    const nextIndex =
      currentIndex >= groups.length - 1 ? 0 : currentIndex + 1;
    onSwitch(groups[nextIndex].id);
  };

  const currentGroup =
    currentIndex >= 0 ? groups[currentIndex] : null;

  return (
    <div className="flex flex-col items-center gap-1 bg-[#0e0e12] border border-[#1e1e24] rounded-lg px-3 py-2.5 sm:py-2">
      <div className="flex items-center gap-3 w-full">
        <button
          onClick={handlePrev}
          disabled={groups.length === 0}
          className="flex items-center justify-center w-11 h-11 sm:w-7 sm:h-7 rounded bg-[#1a1a20] text-[#c8c8d4] hover:bg-[#24242c] active:bg-[#2e2e38] disabled:opacity-30 transition-colors text-lg sm:text-sm"
        >
          &lsaquo;
        </button>
        <div className="flex-1 text-center">
          <div className="text-base sm:text-sm font-medium text-[#c8c8d4] truncate">
            {currentGroup ? currentGroup.name : "No Groups"}
          </div>
        </div>
        <button
          onClick={handleNext}
          disabled={groups.length === 0}
          className="flex items-center justify-center w-11 h-11 sm:w-7 sm:h-7 rounded bg-[#1a1a20] text-[#c8c8d4] hover:bg-[#24242c] active:bg-[#2e2e38] disabled:opacity-30 transition-colors text-lg sm:text-sm"
        >
          &rsaquo;
        </button>
      </div>
      <div className="text-xs sm:text-[10px] text-[#6a6a78]">
        {groups.length > 0
          ? `${currentIndex + 1} / ${groups.length} groups`
          : "0 groups"}
      </div>
    </div>
  );
}
