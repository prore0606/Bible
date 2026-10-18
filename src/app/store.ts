// 앱 전역 상태 (zustand 1개 + 저장소 연동). 화면은 이 상태와 액션만 쓰고 SQL·규칙을 직접 건드리지 않는다.
// 규칙은 src/lib/ 의 순수 함수, 저장은 src/lib/storage.ts 가 맡는다.
import { createStore, useStore } from "zustand";
import type { DayLog, Ref, SavedVerse, Settings } from "@/app/types";
import { previewOf } from "@/lib/bible";
import { getStorage } from "@/lib/db/client";
import { addDays, toDateKey } from "@/lib/date";
import { tomorrowRef } from "@/lib/home";
import { completeMission, markRead, missionStatus, startMission, type MissionStatus } from "@/lib/mission";
import { verseId } from "@/lib/reading";
import type { SettingsPatch, Stats, Storage } from "@/lib/storage";
import { REVIVE_COOLDOWN_DAYS, canRevive, currentStreak, filledDates, missedYesterday } from "@/lib/streak";

const DAY_MS = 86_400_000;

export type AppState = {
  status: "idle" | "loading" | "ready" | "error";
  error?: string;
  settings?: Settings;
  /** 지금의 현지 날짜 (YYYY-MM-DD). refresh() 때 다시 계산한다. */
  today: string;
  todayLog?: DayLog;
  /** 날짜 오름차순 전체 기록 — 연속 기록·달력 계산용 */
  logs: DayLog[];
  stats?: Stats;
  /** 저장한 구절 전체 (최근 저장한 순서) */
  savedVerses: SavedVerse[];
  /** 최근 7일 안에 되살린 시각들 — 되살리기 가능 여부 판단용 */
  revivedAts: string[];
  /**
   * 지금 읽기→기도 흐름이 진행 중인 미션의 날짜 (메모리에만 둔다).
   * 23:50에 읽기를 시작해 00:10에 기도를 남겨도 전날 미션으로 완료되게 한다.
   * 앱을 끄거나 흐름을 떠나면(leaveFlow) 사라지고, 다음 날 이어서 완료할 수 없다.
   */
  activeDate?: string;
  /** 방금 완료한 미션 (메모리에만). 광고 관문과 완료 시트가 무엇을 완료했는지 알기 위해 쓴다. */
  lastCompleted?: DayLog;

  init(): Promise<void>;
  refresh(): Promise<void>;
  updateSettings(patch: SettingsPatch): Promise<void>;
  /** /read 진입: 오늘 미션 로그가 없으면 만들고 흐름을 시작한다 */
  beginReading(): Promise<DayLog>;
  /** "다 읽었어요" */
  finishReading(): Promise<void>;
  /** "기도 남기고 미션 완료" */
  completePrayer(prayer: string, linkedVerseId?: string): Promise<DayLog>;
  /**
   * /pray 진입: 기도를 이어서 쓸 수 있는 오늘 미션(읽기를 마쳤고 아직 완료 전)을 찾아 흐름을 잇는다.
   * 없으면 undefined 이고, 화면이 /read 나 /home 으로 보낸다. 앱을 다시 켠 뒤에도 같은 날이면 이어진다.
   */
  resumePrayer(): Promise<DayLog | undefined>;
  /** 읽기·기도 화면을 떠날 때 (홈으로 등) */
  leaveFlow(): void;
  /** 구절을 저장하거나, 이미 저장돼 있으면 취소한다. 저장된 상태가 되면 true. */
  toggleVerse(input: { ref: Ref; verse: number; text: string }): Promise<boolean>;
  /** 저장한 구절을 지운다(저장 취소). 지운 구절을 돌려주어 "되돌리기"에 쓴다. 이미 없으면 undefined. */
  removeVerse(id: string): Promise<SavedVerse | undefined>;
  /** 지웠던 구절을 원래 저장 시각 그대로 다시 저장한다 ("되돌리기") */
  restoreVerse(verse: SavedVerse): Promise<void>;
  /**
   * 어제를 되살린다 (보상형 광고를 끝까지 본 뒤에 부른다). 되살릴 수 없는 상태면 예외.
   * 되살린 날은 연속 기록만 잇고 포도알·성장일은 늘지 않는다. 되살린 날짜를 돌려준다.
   */
  reviveYesterday(): Promise<string>;
};

export type StoreDeps = {
  getStorage: () => Promise<Storage>;
  /** 현재 시각. 테스트에서 바꿔 끼운다. */
  now?: () => Date;
};

export function createAppStore({ getStorage, now = () => new Date() }: StoreDeps) {
  // 쓰기 작업을 한 줄로 세운다 — 같은 진도를 동시에 읽고 써서 장이 어긋나는 일을 막는다.
  let tail: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(work: () => Promise<T>): Promise<T> => {
    const run = tail.then(work, work);
    tail = run.catch(() => undefined);
    return run;
  };

  return createStore<AppState>()((set, get) => {
    const storage = () => getStorage();

    async function load() {
      const s = await storage();
      const since = new Date(now().getTime() - REVIVE_COOLDOWN_DAYS * DAY_MS).toISOString();
      const [settings, logs, stats, savedVerses, revivedAts] = await Promise.all([
        s.getSettings(),
        s.listDayLogs(),
        s.getStats(),
        s.listSavedVerses(),
        s.listRevivedAtSince(since),
      ]);
      const today = toDateKey(now());
      const active = get().activeDate;
      const activeLog = active ? logs.find((l) => l.date === active) : undefined;
      set({
        settings,
        logs,
        stats,
        savedVerses,
        revivedAts,
        today,
        todayLog: logs.find((l) => l.date === today),
        // 이미 완료됐거나 기록이 없으면 흐름은 끝난 것
        activeDate: activeLog && !activeLog.completedAt ? active : undefined,
      });
    }

    return {
      status: "idle",
      today: toDateKey(now()),
      logs: [],
      savedVerses: [],
      revivedAts: [],

      async init() {
        if (get().status === "ready" || get().status === "loading") return;
        set({ status: "loading", error: undefined });
        try {
          await load();
          set({ status: "ready" });
        } catch (e) {
          set({ status: "error", error: e instanceof Error ? e.message : String(e) });
        }
      },

      refresh: () => enqueue(load),

      updateSettings: (patch) =>
        enqueue(async () => {
          await (await storage()).updateSettings(patch);
          await load();
        }),

      beginReading: () =>
        enqueue(async () => {
          const s = await storage();
          const active = get().activeDate;
          const activeLog = active ? await s.getDayLog(active) : undefined;
          // 진행 중인 흐름이 있으면 그 날짜로 이어가고(자정 넘김), 없으면 오늘로 시작한다
          const date = activeLog && !activeLog.completedAt ? activeLog.date : toDateKey(now());

          const existing = await s.getDayLog(date);
          const started = startMission(date, await s.getSettings(), existing);
          if (!existing) await s.createMissionLog(started.log, started.progress);

          set({ activeDate: started.log.date });
          await load();
          return started.log;
        }),

      finishReading: () =>
        enqueue(async () => {
          const s = await storage();
          const date = get().activeDate;
          if (!date) throw new Error("진행 중인 읽기가 없습니다");
          const log = await s.getDayLog(date);
          if (!log) throw new Error(`${date} 미션 기록이 없습니다`);
          const read = markRead(log, now().toISOString());
          if (read !== log) await s.saveReadAt(date, read.readAt!);
          await load();
        }),

      completePrayer: (prayer, linkedVerseId) =>
        enqueue(async () => {
          const s = await storage();
          const date = get().activeDate;
          if (!date) throw new Error("진행 중인 미션이 없습니다");
          const log = await s.getDayLog(date);
          if (!log) throw new Error(`${date} 미션 기록이 없습니다`);
          const settings = await s.getSettings();
          const done = completeMission(log, prayer, linkedVerseId, now().toISOString(), settings);
          await s.saveCompletedMission(done.log, done.progress);
          set({ activeDate: undefined, lastCompleted: done.log });
          await load();
          return done.log;
        }),

      resumePrayer: () =>
        enqueue(async () => {
          const s = await storage();
          const date = get().activeDate ?? toDateKey(now());
          const log = await s.getDayLog(date);
          if (!log || !log.readAt || log.completedAt) return undefined;
          set({ activeDate: date });
          await load();
          return log;
        }),

      leaveFlow: () => set({ activeDate: undefined }),

      toggleVerse: ({ ref, verse, text }) =>
        enqueue(async () => {
          const s = await storage();
          const id = verseId(ref, verse);
          const already = (await s.listSavedVersesInChapter(ref)).some((v) => v.id === id);
          const nowIso = now().toISOString();
          if (already) {
            await s.unsaveVerse(id, nowIso);
          } else {
            await s.saveVerse({ id, ref, verse, preview: previewOf(text), savedAt: nowIso });
          }
          await load();
          return !already;
        }),

      removeVerse: (id) =>
        enqueue(async () => {
          const s = await storage();
          const target = (await s.listSavedVerses()).find((v) => v.id === id);
          if (!target) return undefined;
          await s.unsaveVerse(id, now().toISOString());
          await load();
          return target;
        }),

      restoreVerse: (verse) =>
        enqueue(async () => {
          await (await storage()).saveVerse(verse);
          await load();
        }),

      reviveYesterday: () =>
        enqueue(async () => {
          const s = await storage();
          const current = now();
          const today = toDateKey(current);
          const [settings, logs, revivedAts] = await Promise.all([
            s.getSettings(),
            s.listDayLogs(),
            s.listRevivedAtSince(new Date(current.getTime() - REVIVE_COOLDOWN_DAYS * DAY_MS).toISOString()),
          ]);
          const filled = filledDates(logs.map((l) => ({ date: l.date, completed: !!l.completedAt, revived: l.revived })));
          // 화면의 버튼 상태가 오래됐을 수 있으니 저장된 기록으로 다시 확인한다 (같은 주에 두 번 쓰는 것을 막는다)
          if (!canRevive(filled, today, revivedAts, current)) throw new Error("지금은 되살릴 수 없어요");
          const date = addDays(today, -1);
          await s.reviveDay(date, tomorrowRef(settings), current.toISOString());
          await load();
          return date;
        }),
    };
  });
}

/** 앱에서 쓰는 하나뿐인 저장소 */
export const appStore = createAppStore({ getStorage });

export const useAppStore = <T,>(selector: (state: AppState) => T): T => useStore(appStore, selector);

// ── 상태에서 계산하는 값 (저장하지 않음) ──────────────────────────────────────
export type HomeSummary = {
  mission: MissionStatus;
  streak: number;
  missedYesterday: boolean;
  /** 어제를 되살릴 수 있는가 (어제 놓침 + 그제 채움 + 최근 7일 미사용) */
  canRevive: boolean;
};

export function selectHomeSummary(
  state: Pick<AppState, "logs" | "today" | "todayLog" | "revivedAts">,
  now: Date = new Date(),
): HomeSummary {
  const filled = filledDates(
    state.logs.map((l) => ({ date: l.date, completed: !!l.completedAt, revived: l.revived })),
  );
  return {
    mission: missionStatus(state.todayLog),
    streak: currentStreak(filled, state.today),
    missedYesterday: missedYesterday(filled, state.today),
    canRevive: canRevive(filled, state.today, state.revivedAts, now),
  };
}
