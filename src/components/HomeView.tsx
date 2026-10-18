"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { appStore, selectHomeSummary, useAppStore } from "@/app/store";
import { useVerseText } from "@/app/useVerseText";
import { Logo, Mascot } from "@/components/art/Mascot";
import { Button, PillButton, Screen } from "@/components/ui";
import { formatRef } from "@/lib/ref";
import { greeting, progressPercent, stepsDone, todayRef, tomorrowRef } from "@/lib/home";

// 08 홈의 본문 (docs/spec.md 5장): 오늘 할 일 2가지와 포도원·저장한 구절 요약. 홈 화면과 미션 완료 시트(12)의 배경이 같이 쓴다.
export default function HomeView() {
  const router = useRouter();
  const settings = useAppStore((s) => s.settings);
  const stats = useAppStore((s) => s.stats);
  const logs = useAppStore((s) => s.logs);
  const today = useAppStore((s) => s.today);
  const todayLog = useAppStore((s) => s.todayLog);
  const revivedAts = useAppStore((s) => s.revivedAts);
  const savedVerses = useAppStore((s) => s.savedVerses);

  // 홈에 들어올 때, 그리고 앱이 다시 앞으로 올 때 날짜를 다시 계산한다 (앱을 켜 둔 채 자정이 지난 경우)
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

  const latest = savedVerses[0];
  const ref = settings ? todayRef(settings, todayLog) : undefined;
  // 초록 배너: 최근 저장한 구절, 없으면 오늘 장의 1절
  const bannerRef = latest?.ref ?? ref;
  const bannerVerse = latest?.verse ?? 1;
  const loadedText = useVerseText(bannerRef, bannerVerse);
  const bannerText = loadedText ?? latest?.preview;

  if (!settings || !stats || !ref || !bannerRef) return null;

  const { mission, streak, canRevive } = summary;
  const done = stepsDone(mission);
  const hello = greeting(streak);

  return (
    <Screen withTabBar className="gap-2">
      <header className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-1.5 text-[19px] font-extrabold tracking-[-0.4px]">
          <Logo size={22} />
          말씀숲
        </div>
        <PillButton onClick={() => router.push("/settings/")}>설정</PillButton>
      </header>

      <Link
        href="/vineyard/"
        className="flex items-center justify-between rounded-[14px] bg-butter px-4 py-3.5 active:opacity-90"
      >
        <p className="text-[14px] font-semibold leading-[1.55] text-butter-text">
          알알이와 함께
          <br />
          {hello.streak !== null ? (
            <>
              <b className="text-grape">{hello.streak}일째</b> {hello.text} ›
            </>
          ) : (
            hello.text
          )}
        </p>
        <Mascot size={52} />
      </Link>

      {canRevive && (
        <Link
          href="/records/"
          className="flex items-center justify-between rounded-[14px] bg-butter px-4 py-3 text-[14px] font-semibold text-butter-text active:opacity-90"
        >
          <span>어제를 놓쳤어요</span>
          <span className="font-bold text-grape">되살리기 ›</span>
        </Link>
      )}

      <div className="grid grid-cols-[1.1fr_1fr] gap-2">
        <section className="row-span-2 flex flex-col justify-between rounded-card bg-card p-4 shadow-card">
          <div>
            <h2 className="text-[15px] font-bold leading-[1.35]">오늘의 미션</h2>
            <p className="mt-1 text-[13px] text-gray">{formatRef(ref)}</p>
          </div>
          <div className="mt-6">
            <div className="text-[13px] font-bold text-blue">2단계 중 {done} 완료</div>
            <div className="mt-1.5 h-[6px] overflow-hidden rounded-full bg-line" aria-hidden="true">
              <div className="h-full rounded-full bg-blue" style={{ width: `${progressPercent(mission)}%` }} />
            </div>
          </div>
        </section>
        <MiniCard href="/vineyard/" title={["나의", "포도원"]} value={`${stats.grapes}알`} />
        <MiniCard href="/records/" title={["저장한", "구절"]} value={`${stats.savedCount}개`} />
      </div>

      <Link
        href={latest ? "/records/" : "/read/"}
        className="relative block min-h-[132px] overflow-hidden rounded-card bg-gradient-to-br from-green-2 to-green p-4 text-white"
      >
        <div className="text-[12px] opacity-85">{latest ? "최근 저장한 말씀 ›" : "오늘의 말씀 ›"}</div>
        <p className="mt-2 line-clamp-3 max-w-[78%] font-bible text-[17px] leading-[1.55] font-bold">
          {bannerText ?? " "}
        </p>
        <div className="mt-1.5 text-[12px] opacity-80">
          {formatRef(bannerRef).replace("장", "")}:{bannerVerse}
        </div>
        <svg viewBox="0 0 100 100" className="absolute right-1 -bottom-2 h-24 w-24" aria-hidden="true">
          <circle cx="56" cy="58" r="40" fill="#fff" opacity=".14" />
          <Mascot size={80} />
        </svg>
      </Link>

      <section className="rounded-card bg-card px-4 shadow-card">
        <MissionRow
          checked={done >= 1}
          label="1장 읽기"
          right={done >= 1 ? "완료" : `${formatRef(ref)} ›`}
          href={done >= 1 ? undefined : "/read/"}
        />
        <MissionRow
          checked={done >= 2}
          label="한 줄 기도 남기기"
          right={done >= 2 ? "완료" : done === 1 ? "하러 가기 ›" : "읽은 뒤에"}
          href={done === 1 ? "/pray/" : undefined}
          divider
        />
      </section>

      {done === 2 && (
        <section className="rounded-card bg-butter p-4 text-center">
          <p className="text-[15px] font-bold text-butter-text">
            오늘 미션 완료! 내일은 {formatRef(tomorrowRef(settings))}
          </p>
          <div className="mt-3">
            <Button onClick={() => router.push("/vineyard/")}>나의 포도원 보기</Button>
          </div>
        </section>
      )}
    </Screen>
  );
}

function MiniCard({ href, title, value }: { href: string; title: [string, string]; value: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-card bg-card px-4 py-3.5 shadow-card active:opacity-90"
    >
      <span className="text-[14px] font-bold leading-[1.35]">
        {title[0]}
        <br />
        {title[1]}
      </span>
      <span className="text-[15px] font-bold text-grape">{value}</span>
    </Link>
  );
}

function MissionRow({
  checked,
  label,
  right,
  href,
  divider = false,
}: {
  checked: boolean;
  label: string;
  right: string;
  href?: string;
  divider?: boolean;
}) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ${
          checked ? "bg-blue text-white" : "border-2 border-gray/40"
        }`}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-[15px] font-semibold">{label}</span>
      <span className={`ml-auto text-[13px] ${href ? "font-bold text-blue" : "text-gray"}`}>{right}</span>
    </>
  );
  const className = `flex items-center gap-2.5 py-3.5 ${divider ? "border-t border-line" : ""}`;
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
