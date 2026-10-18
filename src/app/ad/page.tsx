"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { appStore, useAppStore } from "@/app/store";
import { Mascot } from "@/components/art/Mascot";
import { adProvider, runInterstitialGate } from "@/lib/ads";
import { toDateKey } from "@/lib/date";

// 11 광고 관문 (docs/spec.md 5장·9장): 미션 완료 직후 하루 1번만 전면 광고를 보여 주고 완료 화면으로 간다.
// 이미 봤거나, 3초 안에 준비되지 않았거나, 오류가 나도 광고 없이 지나가므로 미션 완료 흐름을 막지 않는다.
export default function AdPage() {
  const router = useRouter();
  const completed = useAppStore((s) => s.lastCompleted);
  const started = useRef(false);

  useEffect(() => {
    if (!completed) {
      router.replace("/home/"); // 주소로 직접 열었거나 새로고침한 경우
      return;
    }
    if (started.current) return; // 개발 모드의 이중 실행에도 광고는 한 번만
    started.current = true;

    (async () => {
      try {
        const today = toDateKey(new Date()); // 기준은 지금 날짜 (미션 날짜가 아님)
        const lastShown = appStore.getState().settings?.lastInterstitialDate;
        const { shown } = await runInterstitialGate(adProvider, lastShown, today);
        if (shown) await appStore.getState().updateSettings({ lastInterstitialDate: today });
      } catch {
        // 저장에 실패해도 완료 화면으로 간다
      }
      router.replace("/done/");
    })();
  }, [completed, router]);

  // 실제 광고는 AdMob 이 화면을 직접 띄우므로 이 화면에는 보일 것이 없다. 웹 개발 모드에서만 "광고 자리"를 보여 준다.
  if (adProvider.kind !== "mock") return <main className="flex-1 bg-bg" />;

  return (
    <main className="flex flex-1 flex-col bg-ink px-4 pt-[calc(16px+env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom))] text-bg">
      <div className="flex items-center justify-between">
        <span className="rounded bg-gold px-2 py-0.5 text-[12px] font-bold text-on-gold">광고</span>
        <span className="text-[13px] opacity-70">곧 넘어가요…</span>
      </div>
      <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-1.5 rounded-card border-[1.5px] border-dashed border-bg/40 text-center">
        <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true" className="opacity-60">
          <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" />
        </svg>
        <b className="text-[16px]">전면 광고 영역</b>
        <span className="text-[12px] opacity-70">웹 개발 모드에서는 1초 뒤에 넘어가요</span>
      </div>
      <div className="mt-4 flex items-center gap-2.5 rounded-[12px] bg-bg/10 px-3 py-3 text-[13px] leading-[1.5]">
        <Mascot size={28} />
        <span>
          오늘 미션 완료! 광고가 끝나면
          <br />
          포도알이 맺혀요
        </span>
      </div>
    </main>
  );
}
