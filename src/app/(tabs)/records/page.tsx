"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { appStore, selectHomeSummary, useAppStore } from "@/app/store";
import { showToast } from "@/app/toast";
import type { SavedVerse } from "@/app/types";
import AdOverlay from "@/components/AdOverlay";
import BannerSlot from "@/components/BannerSlot";
import { Screen } from "@/components/ui";
import { useLongPress } from "@/components/useLongPress";
import { adProvider, runRewardedGate } from "@/lib/ads";
import { WEEKDAY_LABELS, buildMonth, cellLabel, formatMonthDay, monthOf, type CalendarCell } from "@/lib/calendar";
import { addDays } from "@/lib/date";
import { formatRef } from "@/lib/ref";
import { parseTab, prayerCards, verseRefLabel, type PrayerCard, type RecordsTab } from "@/lib/records";

// 14 기록 (docs/spec.md 5장): 이번 달 달력, 기도 카드, 저장한 구절, 놓친 날 되살리기
export default function RecordsPage() {
  // useSearchParams 는 정적 export 에서 Suspense 안에 있어야 한다
  return (
    <Suspense fallback={null}>
      <RecordsView />
    </Suspense>
  );
}

function RecordsView() {
  const initialTab = parseTab(useSearchParams().get("tab"));
  const [tab, setTab] = useState<RecordsTab>(initialTab);

  const logs = useAppStore((s) => s.logs);
  const today = useAppStore((s) => s.today);
  const todayLog = useAppStore((s) => s.todayLog);
  const revivedAts = useAppStore((s) => s.revivedAts);
  const savedVerses = useAppStore((s) => s.savedVerses);
  const ready = useAppStore((s) => s.status === "ready");

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
  const { year, month } = monthOf(today);
  const monthView = useMemo(() => buildMonth(year, month, logs, today), [year, month, logs, today]);
  const cards = useMemo(() => prayerCards(logs, savedVerses), [logs, savedVerses]);

  // ── 놓친 날 되살리기 (보상형 광고) ───────────────────────────────────────
  const [adBusy, setAdBusy] = useState(false);
  const revive = async () => {
    if (adBusy) return;
    setAdBusy(true);
    try {
      const { rewarded } = await runRewardedGate(adProvider);
      if (!rewarded) {
        showToast("지금은 광고를 불러올 수 없어요"); // 되살리지 않는다
        return;
      }
      await appStore.getState().reviveYesterday();
      showToast("연속 기록을 되살렸어요");
    } catch {
      showToast("되살리지 못했어요. 다시 시도해 주세요");
    } finally {
      setAdBusy(false);
    }
  };

  // ── 저장한 구절 삭제 (확인 창 없이, "되돌리기"를 함께 보여 준다) ─────────────
  const removeVerse = async (id: string) => {
    const removed = await appStore.getState().removeVerse(id);
    if (!removed) return;
    showToast("저장을 취소했어요", { label: "되돌리기", run: () => void appStore.getState().restoreVerse(removed) });
  };

  if (!ready) return null;

  return (
    <Screen withTabBar>
      <header className="flex items-center justify-between pb-2">
        <h1 className="text-[20px] font-extrabold tracking-[-0.4px]">기록</h1>
        <span className="rounded-full bg-line px-3.5 py-1.5 text-[13px] font-medium text-gray-text">{month}월</span>
      </header>

      <div role="tablist" aria-label="기록 종류" className="flex gap-5 border-b border-line">
        <TabButton current={tab} value="prayer" onSelect={setTab}>
          기도
        </TabButton>
        <TabButton current={tab} value="saved" onSelect={setTab}>
          저장한 구절
        </TabButton>
      </div>

      {tab === "prayer" ? (
        <div role="tabpanel" aria-label="기도" className="mt-3 flex flex-col gap-2">
          <CalendarCard year={monthView.year} month={monthView.month} cells={monthView.cells} completed={monthView.completed} />

          {summary.canRevive && (
            <section className="flex items-center justify-between gap-3 rounded-card bg-butter px-4 py-3.5">
              <div>
                <b className="block text-[15px]">{formatMonthDay(addDays(today, -1))}을 놓쳤어요</b>
                <span className="text-[13px] text-butter-text">광고를 보면 연속 기록을 되살려요</span>
              </div>
              <button
                type="button"
                onClick={revive}
                disabled={adBusy}
                className="shrink-0 rounded-full bg-grape-solid px-4 py-2 text-[14px] font-bold text-white disabled:opacity-50"
              >
                ▶ 되살리기
              </button>
            </section>
          )}

          {cards.length === 0 ? (
            <p className="mt-6 text-center text-[14px] leading-[1.6] text-gray-text">
              아직 남긴 기도가 없어요.
              <br />
              오늘 첫 기도를 남기면 여기에 카드로 쌓여요.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {cards.map((card) => (
                <PrayerCardView key={card.date} card={card} />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div role="tabpanel" aria-label="저장한 구절" className="mt-3">
          {savedVerses.length === 0 ? (
            <p className="mt-6 text-center text-[14px] leading-[1.6] text-gray-text">
              저장한 구절이 없어요.
              <br />
              읽다가 마음에 드는 구절을 누르면 여기에 저장돼요.
            </p>
          ) : (
            <>
              <p className="mb-2 text-[12px] text-gray-text">카드를 길게 누르면 삭제해요</p>
              <ul className="flex flex-col gap-2">
                {savedVerses.map((verse) => (
                  <SavedVerseCard key={verse.id} verse={verse} onDelete={() => void removeVerse(verse.id)} />
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="h-14" aria-hidden="true" />
      <BannerSlot />
      {adBusy && adProvider.kind === "mock" && <AdOverlay message="웹 개발 모드에서는 1초 뒤에 보상이 지급돼요" />}
    </Screen>
  );
}

function TabButton({
  current,
  value,
  onSelect,
  children,
}: {
  current: RecordsTab;
  value: RecordsTab;
  onSelect: (tab: RecordsTab) => void;
  children: React.ReactNode;
}) {
  const on = current === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={() => onSelect(value)}
      className={`-mb-px border-b-[2.5px] pb-2.5 text-[15px] ${on ? "border-ink font-bold text-ink" : "border-transparent text-gray-text"}`}
    >
      {children}
    </button>
  );
}

function CalendarCard({
  year,
  month,
  cells,
  completed,
}: {
  year: number;
  month: number;
  cells: (CalendarCell | null)[];
  completed: number;
}) {
  return (
    <section className="rounded-card bg-card p-4 shadow-card" aria-label={`${year}년 ${month}월 달력`}>
      <div className="flex items-center justify-between text-[14px] font-bold">
        <span>이번 달 맺은 포도알</span>
        <span className="text-grape">{completed}알</span>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-gray-text" aria-hidden="true">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, i) =>
          cell === null ? (
            <span key={`blank-${i}`} aria-hidden="true" />
          ) : (
            <span
              key={cell.date}
              aria-label={cellLabel(cell, month)}
              className={`flex aspect-square items-center justify-center rounded-[8px] text-[11px] font-semibold ${
                cell.status === "completed"
                  ? cell.isToday
                    ? "bg-grape-solid text-white"
                    : "bg-grape-solid text-white"
                  : cell.status === "revived"
                    ? "border-2 border-grape-light text-grape"
                    : "bg-line text-gray-text"
              } ${cell.isToday ? "ring-2 ring-gold" : ""}`}
            >
              {cell.day}
            </span>
          ),
        )}
      </div>
    </section>
  );
}

function PrayerCardView({ card }: { card: PrayerCard }) {
  return (
    <li className="rounded-card bg-card p-4 shadow-card">
      <div className="flex items-center justify-between text-[12px] text-gray-text">
        <span>
          {formatMonthDay(card.date)} · {formatRef(card.ref)}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="text-grape">
          <circle cx="6" cy="6" r="5" fill="currentColor" />
        </svg>
      </div>
      {card.verse && (
        <p className="mt-2 border-l-[3px] border-green pl-2.5 font-bible text-[14px] leading-[1.55] font-bold">
          {card.verse.preview} <span className="font-sans text-[12px] font-medium text-gray-text">({card.verse.label})</span>
        </p>
      )}
      <p className="mt-2 text-[15px] leading-[1.6]">{card.prayer}</p>
    </li>
  );
}

function SavedVerseCard({ verse, onDelete }: { verse: SavedVerse; onDelete: () => void }) {
  const press = useLongPress(onDelete);
  return (
    <li
      {...press}
      tabIndex={0}
      aria-label={`${verseRefLabel(verse)} ${verse.preview}. 삭제하려면 길게 누르거나 Delete 키를 누르세요`}
      onKeyDown={(e) => (e.key === "Delete" || e.key === "Backspace") && onDelete()}
      className="relative touch-pan-y rounded-card bg-card p-4 shadow-card select-none"
    >
      <div className="flex items-center gap-1.5 text-[12px] font-bold text-green-text">
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 3h12v18l-6-4-6 4z" fill="currentColor" />
        </svg>
        {verseRefLabel(verse)}
      </div>
      <p className="mt-1.5 font-bible text-[15px] leading-[1.6] font-bold">{verse.preview}</p>
    </li>
  );
}
