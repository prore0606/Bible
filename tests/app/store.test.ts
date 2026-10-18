import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAppStore, selectHomeSummary } from "@/app/store";
import { migrate } from "@/lib/db/migrate";
import { createStorage, type Storage } from "@/lib/storage";
import { createNodeExecutor } from "../helpers/nodeExecutor";

let db: ReturnType<typeof createNodeExecutor>;
let storage: Storage;
let clock: Date;

const newStore = () => createAppStore({ getStorage: async () => storage, now: () => clock });
const at = (y: number, m: number, d: number, h = 9, min = 0) => new Date(y, m - 1, d, h, min);

beforeEach(async () => {
  db = createNodeExecutor();
  await migrate(db);
  storage = createStorage(db);
  clock = at(2026, 10, 18);
});
afterEach(() => db.close());

describe("init", () => {
  it("기본 상태를 불러온다", async () => {
    const store = newStore();
    expect(store.getState().status).toBe("idle");
    await store.getState().init();
    const s = store.getState();
    expect(s.status).toBe("ready");
    expect(s.today).toBe("2026-10-18");
    expect(s.settings?.next).toEqual({ book: "GEN", chapter: 1 });
    expect(s.todayLog).toBeUndefined();
    expect(s.stats).toEqual({ completedDays: 0, grapes: 0, growthDay: 1, savedCount: 0 });
  });

  it("저장소 오류는 error 상태로 알린다", async () => {
    const store = createAppStore({
      getStorage: async () => {
        throw new Error("DB를 열 수 없어요");
      },
    });
    await store.getState().init();
    expect(store.getState()).toMatchObject({ status: "error", error: "DB를 열 수 없어요" });
  });
});

describe("하루 미션 흐름", () => {
  it("읽기 시작 → 다 읽었어요 → 기도 → 완료까지 상태가 따라 바뀐다", async () => {
    const store = newStore();
    await store.getState().init();
    expect(selectHomeSummary(store.getState()).mission).toBe("before");

    const log = await store.getState().beginReading();
    expect(log.ref).toEqual({ book: "GEN", chapter: 1 });
    expect(store.getState().activeDate).toBe("2026-10-18");
    expect(selectHomeSummary(store.getState()).mission).toBe("before"); // 로그만 만든 상태

    await store.getState().finishReading();
    expect(selectHomeSummary(store.getState()).mission).toBe("read");

    clock = at(2026, 10, 18, 9, 5);
    const done = await store.getState().completePrayer("감사합니다");
    expect(done.completedAt).toBe(clock.toISOString());
    const s = store.getState();
    expect(selectHomeSummary(s)).toEqual({ mission: "done", streak: 1, missedYesterday: false, canRevive: false });
    expect(s.settings?.next).toEqual({ book: "GEN", chapter: 2 });
    expect(s.stats).toMatchObject({ completedDays: 1, growthDay: 2 });
    expect(s.activeDate).toBeUndefined();
  });

  it("읽기 전에는 기도를 완료할 수 없다", async () => {
    const store = newStore();
    await store.getState().init();
    await store.getState().beginReading();
    await expect(store.getState().completePrayer("기도")).rejects.toMatchObject({ code: "NOT_READ" });
    expect(selectHomeSummary(store.getState()).mission).toBe("before");
  });

  it("흐름을 시작하지 않고 읽기·기도를 부르면 알려 준다", async () => {
    const store = newStore();
    await store.getState().init();
    await expect(store.getState().finishReading()).rejects.toThrow(/읽기가 없습니다/);
    await expect(store.getState().completePrayer("기도")).rejects.toThrow(/미션이 없습니다/);
  });

  it("같은 날 beginReading 을 여러 번 불러도 로그는 하나", async () => {
    const store = newStore();
    await store.getState().init();
    await store.getState().beginReading();
    await store.getState().beginReading();
    expect(store.getState().logs).toHaveLength(1);
  });

  it("동시에 여러 번 불러도 진도가 어긋나지 않는다 (쓰기를 한 줄로 처리)", async () => {
    const store = newStore();
    await store.getState().init();
    await Promise.all([store.getState().beginReading(), store.getState().beginReading(), store.getState().beginReading()]);
    expect(store.getState().logs).toHaveLength(1);

    await store.getState().finishReading();
    const results = await Promise.allSettled([
      store.getState().completePrayer("첫 번째"),
      store.getState().completePrayer("두 번째"),
    ]);
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected"]);
    expect(store.getState().settings?.next).toEqual({ book: "GEN", chapter: 2 }); // 한 번만 넘어감
    expect(store.getState().stats?.completedDays).toBe(1);
  });

  it("미션을 마친 날 다시 beginReading 하면 완료된 로그를 돌려준다 (하루 1번)", async () => {
    const store = newStore();
    await store.getState().init();
    await store.getState().beginReading();
    await store.getState().finishReading();
    await store.getState().completePrayer("기도");
    const again = await store.getState().beginReading();
    expect(again.completedAt).toBeDefined();
    expect(store.getState().logs).toHaveLength(1);
  });
});

describe("자정 넘김 (docs/spec.md 7.1)", () => {
  it("23:50에 읽기를 시작해 00:10에 기도를 남겨도 전날 미션으로 완료된다", async () => {
    const store = newStore();
    clock = at(2026, 10, 18, 23, 50);
    await store.getState().init();
    await store.getState().beginReading();
    await store.getState().finishReading();

    clock = at(2026, 10, 19, 0, 10);
    await store.getState().refresh();
    expect(store.getState().today).toBe("2026-10-19");
    expect(store.getState().activeDate).toBe("2026-10-18"); // 흐름은 이어진다

    const done = await store.getState().completePrayer("기도");
    expect(done.date).toBe("2026-10-18");
    const s = store.getState();
    expect(s.logs.map((l) => l.date)).toEqual(["2026-10-18"]);
    expect(s.todayLog).toBeUndefined(); // 오늘(19일) 미션은 아직 시작 전
    expect(selectHomeSummary(s)).toMatchObject({ mission: "before", streak: 1 });
  });

  it("흐름을 떠난 뒤 다음 날 오면 어제 미션을 이어서 완료할 수 없고, 같은 장으로 새로 시작한다", async () => {
    const store = newStore();
    clock = at(2026, 10, 18, 23, 50);
    await store.getState().init();
    await store.getState().beginReading();
    await store.getState().finishReading();
    store.getState().leaveFlow();

    clock = at(2026, 10, 19, 8, 0);
    await store.getState().refresh();
    const log = await store.getState().beginReading();
    expect(log.date).toBe("2026-10-19");
    expect(log.ref).toEqual({ book: "GEN", chapter: 1 }); // 어제 못 끝낸 장을 다시
    expect(store.getState().logs.map((l) => l.date)).toEqual(["2026-10-18", "2026-10-19"]);

    await store.getState().finishReading();
    const done = await store.getState().completePrayer("기도");
    expect(done.date).toBe("2026-10-19");
    // 어제는 완료되지 않은 채 남는다 → 놓친 날
    expect(store.getState().logs[0].completedAt).toBeUndefined();
  });

  it("앱이 다시 시작되면(메모리 초기화) 흐름은 사라진다", async () => {
    const first = newStore();
    clock = at(2026, 10, 18, 23, 50);
    await first.getState().init();
    await first.getState().beginReading();
    await first.getState().finishReading();

    const restarted = newStore();
    clock = at(2026, 10, 19, 0, 10);
    await restarted.getState().init();
    expect(restarted.getState().activeDate).toBeUndefined();
    await expect(restarted.getState().completePrayer("기도")).rejects.toThrow(/미션이 없습니다/);
  });
});

describe("설정", () => {
  it("바꾼 설정이 상태에 반영된다", async () => {
    const store = newStore();
    await store.getState().init();
    await store.getState().updateSettings({ theme: "dark", fontSize: "l" });
    expect(store.getState().settings).toMatchObject({ theme: "dark", fontSize: "l" });
  });

  it("읽는 곳 변경은 오늘 미션이 아니라 다음 미션부터 적용된다", async () => {
    const store = newStore();
    await store.getState().init();
    await store.getState().beginReading(); // 오늘은 창세기 1장으로 시작
    await store.getState().updateSettings({ pendingNext: { book: "PSA", chapter: 23 } });
    await store.getState().finishReading();
    await store.getState().completePrayer("기도");

    clock = at(2026, 10, 19);
    await store.getState().refresh();
    const tomorrow = await store.getState().beginReading();
    expect(tomorrow.ref).toEqual({ book: "PSA", chapter: 23 });
  });
});

describe("selectHomeSummary", () => {
  it("연속 기록과 어제 놓침을 계산한다", async () => {
    const store = newStore();
    for (const day of [14, 15, 16]) {
      clock = at(2026, 10, day);
      await store.getState().init();
      await store.getState().refresh();
      await store.getState().beginReading();
      await store.getState().finishReading();
      await store.getState().completePrayer("기도");
    }
    clock = at(2026, 10, 17); // 16일까지 했고 오늘은 17일: 아직 이어지는 중
    await store.getState().refresh();
    expect(selectHomeSummary(store.getState())).toMatchObject({ streak: 3, missedYesterday: false });

    clock = at(2026, 10, 18); // 17일을 안 했다
    await store.getState().refresh();
    expect(selectHomeSummary(store.getState())).toMatchObject({ streak: 0, missedYesterday: true });
  });
});

describe("저장한 구절 (읽기 화면)", () => {
  const GEN1 = { book: "GEN", chapter: 1 } as const;

  it("구절을 누르면 저장되고, 다시 누르면 취소된다", async () => {
    const store = newStore();
    await store.getState().init();
    const text = "하나님이 가라사대 빛이 있으라 하시매 빛이 있었고";

    expect(await store.getState().toggleVerse({ ref: GEN1, verse: 3, text })).toBe(true);
    expect(store.getState().savedVerses.map((v) => v.id)).toEqual(["GEN.1.3"]);
    expect(store.getState().stats?.savedCount).toBe(1);

    expect(await store.getState().toggleVerse({ ref: GEN1, verse: 3, text })).toBe(false);
    expect(store.getState().savedVerses).toEqual([]);
    expect(store.getState().stats?.savedCount).toBe(0);
  });

  it("미리보기는 본문 앞 40자까지 저장한다", async () => {
    const store = newStore();
    await store.getState().init();
    const long = "가".repeat(70);
    await store.getState().toggleVerse({ ref: GEN1, verse: 2, text: long });
    expect(store.getState().savedVerses[0].preview).toBe("가".repeat(40));
  });

  it("최근 저장한 구절이 맨 앞에 온다 (홈의 초록 배너)", async () => {
    const store = newStore();
    await store.getState().init();
    clock = at(2026, 10, 18, 9, 0);
    await store.getState().toggleVerse({ ref: GEN1, verse: 1, text: "태초에" });
    clock = at(2026, 10, 18, 9, 5);
    await store.getState().toggleVerse({ ref: GEN1, verse: 3, text: "빛이 있으라" });
    expect(store.getState().savedVerses.map((v) => v.id)).toEqual(["GEN.1.3", "GEN.1.1"]);
  });

  it("취소했던 구절을 다시 저장하면 다시 보인다", async () => {
    const store = newStore();
    await store.getState().init();
    const input = { ref: GEN1, verse: 3, text: "빛이 있으라" };
    await store.getState().toggleVerse(input);
    await store.getState().toggleVerse(input);
    expect(await store.getState().toggleVerse(input)).toBe(true);
    expect(store.getState().savedVerses).toHaveLength(1);
  });

  it("빠르게 두 번 눌러도 순서대로 처리돼 저장 → 취소가 된다", async () => {
    const store = newStore();
    await store.getState().init();
    const input = { ref: GEN1, verse: 5, text: "첫째 날" };
    const results = await Promise.all([store.getState().toggleVerse(input), store.getState().toggleVerse(input)]);
    expect(results).toEqual([true, false]);
    expect(store.getState().savedVerses).toEqual([]);
  });
});

describe("selectHomeSummary.canRevive", () => {
  it("어제만 놓치고 그제까지 이어졌으면 되살릴 수 있다", async () => {
    const store = newStore();
    for (const day of [15, 16]) {
      clock = at(2026, 10, day);
      await store.getState().init();
      await store.getState().refresh();
      await store.getState().beginReading();
      await store.getState().finishReading();
      await store.getState().completePrayer("기도");
    }
    clock = at(2026, 10, 18); // 17일을 놓침
    await store.getState().refresh();
    const s = store.getState();
    expect(selectHomeSummary(s, clock)).toMatchObject({ missedYesterday: true, canRevive: true });
  });

  it("이틀 놓쳤으면 되살릴 수 없다", async () => {
    const store = newStore();
    clock = at(2026, 10, 15);
    await store.getState().init();
    await store.getState().beginReading();
    await store.getState().finishReading();
    await store.getState().completePrayer("기도");
    clock = at(2026, 10, 18); // 16, 17일을 놓침
    await store.getState().refresh();
    expect(selectHomeSummary(store.getState(), clock)).toMatchObject({ missedYesterday: true, canRevive: false });
  });
});

describe("기도 이어서 쓰기 · 방금 완료한 미션 (T7)", () => {
  it("읽기를 마친 뒤 resumePrayer 는 오늘 로그를 돌려주고 흐름을 잇는다", async () => {
    const store = newStore();
    await store.getState().init();
    await store.getState().beginReading();
    await store.getState().finishReading();
    store.getState().leaveFlow();
    const log = await store.getState().resumePrayer();
    expect(log?.date).toBe("2026-10-18");
    expect(store.getState().activeDate).toBe("2026-10-18");
  });

  it("앱을 다시 켜도(메모리 초기화) 같은 날이면 기도를 이어서 쓸 수 있다", async () => {
    const first = newStore();
    await first.getState().init();
    await first.getState().beginReading();
    await first.getState().finishReading();

    const restarted = newStore();
    await restarted.getState().init();
    expect(restarted.getState().activeDate).toBeUndefined();
    expect(await restarted.getState().resumePrayer()).toBeDefined();
    const done = await restarted.getState().completePrayer("기도");
    expect(done.completedAt).toBeDefined();
  });

  it("읽기 전에는 이어서 쓸 수 없다", async () => {
    const store = newStore();
    await store.getState().init();
    await store.getState().beginReading();
    expect(await store.getState().resumePrayer()).toBeUndefined();
  });

  it("미션 기록이 아예 없어도 undefined", async () => {
    const store = newStore();
    await store.getState().init();
    expect(await store.getState().resumePrayer()).toBeUndefined();
  });

  it("이미 완료했으면 undefined (하루 1번)", async () => {
    const store = newStore();
    await store.getState().init();
    await store.getState().beginReading();
    await store.getState().finishReading();
    await store.getState().completePrayer("기도");
    expect(await store.getState().resumePrayer()).toBeUndefined();
  });

  it("어제 읽기만 하고 앱을 껐다가 다음 날 열면 어제 미션은 이어지지 않는다", async () => {
    const first = newStore();
    clock = at(2026, 10, 18, 23, 50);
    await first.getState().init();
    await first.getState().beginReading();
    await first.getState().finishReading();

    const next = newStore();
    clock = at(2026, 10, 19, 8, 0);
    await next.getState().init();
    expect(await next.getState().resumePrayer()).toBeUndefined();
  });

  it("completePrayer 는 방금 완료한 미션을 lastCompleted 에 남긴다 (자정을 넘겨도 미션 날짜 그대로)", async () => {
    const store = newStore();
    clock = at(2026, 10, 18, 23, 50);
    await store.getState().init();
    await store.getState().beginReading();
    await store.getState().finishReading();
    clock = at(2026, 10, 19, 0, 10);
    await store.getState().completePrayer("기도", undefined);
    expect(store.getState().lastCompleted).toMatchObject({ date: "2026-10-18", prayer: "기도" });
  });

  it("저장한 구절을 연결해 완료하면 lastCompleted 에 연결 ID 가 남는다", async () => {
    const store = newStore();
    await store.getState().init();
    await store.getState().beginReading();
    await store.getState().finishReading();
    await store.getState().toggleVerse({ ref: { book: "GEN", chapter: 1 }, verse: 3, text: "빛이 있으라" });
    await store.getState().completePrayer("빛이 있게 하소서", "GEN.1.3");
    expect(store.getState().lastCompleted?.linkedVerseId).toBe("GEN.1.3");
  });
});
