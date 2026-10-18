// 앱 전역 상태 (zustand 1개 + 저장소 연동). 화면은 이 상태와 액션만 쓰고 SQL·규칙을 직접 건드리지 않는다.
// 규칙은 src/lib/ 의 순수 함수, 저장은 src/lib/storage.ts 가 맡는다.
import { createStore, useStore } from "zustand";
import type { DayLog, Settings } from "@/app/types";
import { getStorage } from "@/lib/db/client";
import { toDateKey } from "@/lib/date";
import { completeMission, markRead, missionStatus, startMission, type MissionStatus } from "@/lib/mission";
import type { SettingsPatch, Stats, Storage } from "@/lib/storage";
import { currentStreak, filledDates, missedYesterday } from "@/lib/streak";

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
  /**
   * 지금 읽기→기도 흐름이 진행 중인 미션의 날짜 (메모리에만 둔다).
   * 23:50에 읽기를 시작해 00:10에 기도를 남겨도 전날 미션으로 완료되게 한다.
   * 앱을 끄거나 흐름을 떠나면(leaveFlow) 사라지고, 다음 날 이어서 완료할 수 없다.
   */
  activeDate?: string;

  init(): Promise<void>;
  refresh(): Promise<void>;
  updateSettings(patch: SettingsPatch): Promise<void>;
  /** /read 진입: 오늘 미션 로그가 없으면 만들고 흐름을 시작한다 */
  beginReading(): Promise<DayLog>;
  /** "다 읽었어요" */
  finishReading(): Promise<void>;
  /** "기도 남기고 미션 완료" */
  completePrayer(prayer: string, linkedVerseId?: string): Promise<DayLog>;
  /** 읽기·기도 화면을 떠날 때 (홈으로 등) */
  leaveFlow(): void;
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
      const [settings, logs, stats] = await Promise.all([s.getSettings(), s.listDayLogs(), s.getStats()]);
      const today = toDateKey(now());
      const active = get().activeDate;
      const activeLog = active ? logs.find((l) => l.date === active) : undefined;
      set({
        settings,
        logs,
        stats,
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
          set({ activeDate: undefined });
          await load();
          return done.log;
        }),

      leaveFlow: () => set({ activeDate: undefined }),
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
};

export function selectHomeSummary(state: Pick<AppState, "logs" | "today" | "todayLog">): HomeSummary {
  const filled = filledDates(
    state.logs.map((l) => ({ date: l.date, completed: !!l.completedAt, revived: l.revived })),
  );
  return {
    mission: missionStatus(state.todayLog),
    streak: currentStreak(filled, state.today),
    missedYesterday: missedYesterday(filled, state.today),
  };
}
