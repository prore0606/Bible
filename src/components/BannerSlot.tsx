"use client";

import { adProvider } from "@/lib/ads";

/** 배너 광고 높이(px). 이 자리만큼 아래에 여백을 두어 내용이 가려지지 않게 한다. */
export const BANNER_HEIGHT = 50;

/**
 * 기록 화면 하단(탭바 바로 위)의 배너 광고 자리 (docs/spec.md 9장). 기록 화면에서만 쓴다.
 * 실제 배너는 AdMob 이 화면 위에 직접 그리므로(T13) 앱에서는 아무것도 그리지 않고, 웹 개발 모드에서만 자리를 보여 준다.
 */
export default function BannerSlot() {
  if (adProvider.kind !== "mock") return null;
  return (
    <div className="fixed bottom-[calc(62px+env(safe-area-inset-bottom))] left-1/2 z-10 w-full max-w-[480px] -translate-x-1/2 px-3 pb-2">
      <div
        className="flex items-center justify-center gap-2 rounded-[8px] border-[1.5px] border-dashed border-gray/40 bg-bg text-[12px] text-gray-text"
        style={{ height: BANNER_HEIGHT - 10 }}
      >
        <span className="rounded bg-gold px-1.5 py-px text-[10px] font-bold text-on-gold">광고</span>
        배너 광고 영역 (320×50)
      </div>
    </div>
  );
}
