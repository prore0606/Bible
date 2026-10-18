"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { appStore, useAppStore } from "@/app/store";
import { showToast } from "@/app/toast";
import type { DayLog } from "@/app/types";
import { BottomBar, Button, Screen } from "@/components/ui";
import { adProvider } from "@/lib/ads";
import { MissionError, normalizePrayer } from "@/lib/mission";
import { chipLabel, limitPrayer, prayerCounter, savedOnDate, toggleLink, validLink } from "@/lib/pray";
import { formatRef } from "@/lib/ref";

// 10 한 줄 기도 (docs/spec.md 5장): 읽은 말씀을 떠올리며 100자 이내로 적고, 미션을 완료한다
export default function PrayPage() {
  const router = useRouter();
  const [log, setLog] = useState<DayLog>();

  useEffect(() => {
    let cancelled = false;
    appStore
      .getState()
      .resumePrayer()
      .then((found) => {
        if (cancelled) return;
        if (!found) {
          // 읽기를 마친 오늘 미션이 없다: 이미 끝냈으면 홈, 아니면 읽기부터
          router.replace(appStore.getState().todayLog?.completedAt ? "/home/" : "/read/");
          return;
        }
        adProvider.prepareInterstitial(); // 기도 저장 직후 지연이 없도록 광고를 미리 불러온다
        setLog(found);
      })
      .catch(() => router.replace("/home/"));
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!log) return null;
  return <PrayView log={log} />;
}

function PrayView({ log }: { log: DayLog }) {
  const router = useRouter();
  const savedVerses = useAppStore((s) => s.savedVerses);
  const [text, setText] = useState("");
  const [linked, setLinked] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const savedToday = useMemo(() => savedOnDate(savedVerses, log.date), [savedVerses, log.date]);
  const canSubmit = normalizePrayer(text) !== null && !submitting;

  const goHome = () => {
    appStore.getState().leaveFlow();
    router.replace("/home/");
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true); // 버튼을 누르는 즉시 잠가 중복 완료를 막는다
    try {
      await appStore.getState().completePrayer(text, validLink(linked, savedToday));
      router.replace("/ad/");
    } catch (e) {
      showToast(e instanceof MissionError ? e.message : "저장하지 못했어요. 다시 시도해 주세요");
      setSubmitting(false);
    }
  };

  return (
    <Screen withBottomBar className="!pt-0">
      <header className="flex items-center justify-between pt-[calc(12px+env(safe-area-inset-top))] pb-2">
        <button type="button" onClick={goHome} className="flex items-center gap-1.5 text-[18px] font-bold">
          <span aria-hidden="true">‹</span>한 줄 기도
        </button>
      </header>

      <div className="flex gap-1" role="img" aria-label="2단계 중 2단계">
        <span className="h-1 flex-1 rounded-full bg-blue" />
        <span className="h-1 flex-1 rounded-full bg-blue" />
      </div>
      <p className="pt-1.5 text-[13px] font-bold text-blue">미션 2/2 · 읽은 말씀을 떠올리며 짧게</p>

      <section className="mt-4 rounded-card bg-gradient-to-br from-green-2 to-green p-4 text-white">
        <div className="text-[12px] opacity-85">오늘 읽은 말씀</div>
        <div className="mt-1 font-bible text-[19px] font-bold">{formatRef(log.ref)}</div>
      </section>

      {savedToday.length > 0 && (
        <section className="mt-4" aria-label="오늘 저장한 구절">
          <div className="text-[14px] font-bold text-ink/70">
            오늘 저장한 구절 <span className="font-medium text-gray">· 눌러서 붙이기</span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {savedToday.map((v) => {
              const on = linked === v.id;
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setLinked((cur) => toggleLink(cur, v.id))}
                    className={`flex w-full items-center gap-2 rounded-[10px] border-[1.5px] px-3 py-2.5 text-left font-bible text-[14px] font-bold ${
                      on ? "border-brand bg-highlight" : "border-line bg-card"
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0 text-green">
                      <path d="M6 3h12v18l-6-4-6 4z" fill="currentColor" />
                    </svg>
                    <span className="flex-1">{chipLabel(v, log.ref)}</span>
                    {on && <span className="font-sans text-[12px] font-bold text-brand">붙임</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <label className="mt-4 block">
        <span className="sr-only">오늘의 기도 (100자 이내)</span>
        <textarea
          value={text}
          onChange={(e) => setText(limitPrayer(e.target.value))}
          placeholder="오늘 읽은 말씀을 떠올리며 한 줄로 적어 보세요"
          rows={4}
          className="min-h-[130px] w-full resize-none rounded-[14px] border-[1.5px] border-blue bg-card p-3.5 text-[16px] leading-[1.6] text-ink outline-none placeholder:text-gray/70"
        />
      </label>
      <div className="mt-1 text-right text-[12px] text-gray" aria-live="polite">
        {prayerCounter(text)}
      </div>

      <BottomBar className="bg-bg">
        <Button onClick={submit} disabled={!canSubmit}>
          기도 남기고 미션 완료
        </Button>
      </BottomBar>
    </Screen>
  );
}
