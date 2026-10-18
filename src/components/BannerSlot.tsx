"use client";

import { useEffect, useState } from "react";
import { adProvider } from "@/lib/ads";

/** 배너 광고 높이(px). 웹 개발 모드의 자리 표시와 앱의 배너(320×50)가 같은 높이를 쓴다. */
export const BANNER_HEIGHT = 50;

/**
 * 기록 화면 하단(탭바 바로 위)의 배너 광고 (docs/spec.md 9장). 기록 화면에서만 쓴다.
 * - 앱: AdMob 이 화면 위에 직접 그린다. 이 컴포넌트는 들어올 때 걸고 나갈 때 걷고, 배너 높이만큼 아래에 빈 자리를 둔다.
 *   광고가 오지 않으면 높이가 0 이 되어 자리가 접힌다 (빈 공간 없음).
 * - 웹 개발 모드: 광고 자리를 그려 보여 준다.
 */
export default function BannerSlot() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (adProvider.kind !== "native") return;
    let active = true;
    void adProvider.showBanner((h) => active && setHeight(h)).catch(() => undefined);
    return () => {
      active = false;
      void adProvider.removeBanner();
    };
  }, []);

  if (adProvider.kind === "native") return height > 0 ? <div aria-hidden="true" style={{ height }} /> : null;

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
