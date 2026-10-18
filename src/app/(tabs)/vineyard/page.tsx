"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";
import { appStore, selectHomeSummary, useAppStore } from "@/app/store";
import { Mascot } from "@/components/art/Mascot";
import { Screen } from "@/components/ui";
import VineScene from "@/components/VineScene";
import { nextMsg, sceneTrees, stageName, todayMsg } from "@/lib/growth";
import { isWilted } from "@/lib/home";

// 13 나의 포도원 (docs/spec.md 5장·7.5): 매일 자라는 포도나무와 이번 단계, 통계
export default function VineyardPage() {
  // useSearchParams 는 정적 export 에서 Suspense 안에 있어야 한다
  return (
    <Suspense fallback={null}>
      <VineyardView />
    </Suspense>
  );
}

/** 개발용: ?day=50 으로 성장일을, ?wilt=1 로 처진 잎을 미리 볼 수 있다. 배포 빌드에서는 무시한다. */
function useDevPreview() {
  const params = useSearchParams();
  if (process.env.NODE_ENV === "production") return { day: undefined, wilt: false };
  const day = Number(params.get("day"));
  return { day: Number.isInteger(day) && day >= 1 && day <= 9999 ? day : undefined, wilt: params.get("wilt") === "1" };
}

function VineyardView() {
  const dev = useDevPreview();
  const stats = useAppStore((s) => s.stats);
  const logs = useAppStore((s) => s.logs);
  const today = useAppStore((s) => s.today);
  const todayLog = useAppStore((s) => s.todayLog);
  const revivedAts = useAppStore((s) => s.revivedAts);

  // 들어올 때, 그리고 앱이 다시 앞으로 올 때 날짜를 다시 계산한다
  useEffect(() => {
    const refresh = () => void appStore.getState().refresh();
    refresh();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const summary = useMemo(
    () => selectHomeSummary({ logs, today, todayLog, revivedAts }),
    [logs, today, todayLog, revivedAts],
  );

  if (!stats) return null;

  const day = dev.day ?? stats.growthDay; // 성장일 = 완료한 날 수 + 1
  const wilt = dev.wilt || isWilted(summary.missedYesterday, summary.mission);
  const stage = stageName(day);
  const hidden = sceneTrees(day).hidden;

  return (
    <Screen withTabBar>
      <header className="flex items-center justify-between pb-3">
        <h1 className="text-[20px] font-extrabold tracking-[-0.4px]">나의 포도원</h1>
      </header>

      <div className="relative h-[270px] overflow-hidden rounded-[20px] bg-gradient-to-b from-cream-1 to-cream-2">
        <VineScene day={day} wilt={wilt} label={`${stage} 단계의 포도나무${wilt ? ", 잎이 조금 처져 있어요" : ""}`} />
        <span className="absolute top-3 left-3 rounded-full bg-card px-3 py-1.5 text-[13px] font-medium shadow-card">
          <b className="text-grape">{day}일째</b>
        </span>
        {hidden > 0 && (
          <span className="absolute top-3 right-3 rounded-full bg-card px-3 py-1.5 text-[13px] font-medium text-gray shadow-card">
            이전 나무 {hidden}그루 더
          </span>
        )}
      </div>

      {wilt && (
        <p className="mt-2 rounded-[10px] bg-butter px-3 py-2 text-center text-[13px] font-semibold text-butter-text">
          어제는 쉬었어요. 오늘 다시 함께 시작해요
        </p>
      )}

      <section className="mt-4" aria-label="이번 단계">
        <h2 className="text-[18px] font-extrabold tracking-[-0.3px]">{stage}</h2>
        <p className="mt-0.5 min-h-[20px] text-[14px] font-semibold text-green">{todayMsg(day)}</p>
      </section>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="읽은 날" value={`${stats.completedDays}일`} />
        <Stat label="맺은 포도알" value={`${stats.grapes}알`} accent />
        <Stat label="연속 기록" value={`${summary.streak}일`} />
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-[12px] bg-butter px-3 py-3 text-[13px] font-semibold text-butter-text">
        <Mascot size={22} />
        <span>{nextMsg(day)}</span>
      </div>
    </Screen>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-card bg-card px-3 py-2.5 shadow-card">
      <div className="text-[12px] text-gray">{label}</div>
      <div className={`mt-1 text-[17px] font-extrabold ${accent ? "text-grape" : ""}`}>{value}</div>
    </div>
  );
}
