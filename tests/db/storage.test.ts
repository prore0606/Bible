import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Ref, SavedVerse } from "@/app/types";
import { migrate } from "@/lib/db/migrate";
import { completeMission, markRead, startMission } from "@/lib/mission";
import { createStorage, type Storage } from "@/lib/storage";
import { canRevive, currentStreak, filledDates } from "@/lib/streak";
import { createNodeExecutor } from "../helpers/nodeExecutor";

const GEN1: Ref = { book: "GEN", chapter: 1 };
const verse = (ref: Ref, v: number, preview = "미리보기", savedAt = "2026-10-18T01:00:00.000Z"): SavedVerse => ({
  id: `${ref.book}.${ref.chapter}.${v}`,
  ref,
  verse: v,
  preview,
  savedAt,
});

let db: ReturnType<typeof createNodeExecutor>;
let store: Storage;

beforeEach(async () => {
  db = createNodeExecutor();
  await migrate(db);
  store = createStorage(db);
});
afterEach(() => db.close());

/** 하루 미션을 처음부터 끝까지 저장소를 거쳐 수행한다 (읽기 시작 시각 / 완료 시각 지정 가능) */
async function doMission(
  date: string,
  prayer = "감사합니다",
  linkedVerseId?: string,
  readIso = `${date}T01:00:00.000Z`,
  doneIso = `${date}T01:05:00.000Z`,
) {
  const settings = await store.getSettings();
  const existing = await store.getDayLog(date);
  const started = startMission(date, settings, existing);
  if (!existing) await store.createMissionLog(started.log, started.progress);
  const read = markRead(started.log, readIso);
  await store.saveReadAt(date, readIso);
  const done = completeMission(read, prayer, linkedVerseId, doneIso, started.progress);
  await store.saveCompletedMission(done.log, done.progress);
  return done;
}

describe("설정", () => {
  it("처음 상태는 spec 기본값이다", async () => {
    expect(await store.getSettings()).toEqual({
      onboarded: false,
      alarm: { enabled: true, hour: 7, minute: 0 },
      langs: { ko: true, en: false },
      fontSize: "m",
      theme: "system",
      next: GEN1,
      pendingNext: undefined,
      lastInterstitialDate: undefined,
    });
  });

  it("일부만 바꿔도 나머지는 그대로다", async () => {
    await store.updateSettings({ theme: "dark", alarm: { enabled: false, hour: 21, minute: 30 } });
    const s = await store.getSettings();
    expect(s.theme).toBe("dark");
    expect(s.alarm).toEqual({ enabled: false, hour: 21, minute: 30 });
    expect(s.fontSize).toBe("m");
    expect(s.langs).toEqual({ ko: true, en: false });
  });

  it("언어는 둘 다 켜는 건 되고, 둘 다 끄는 건 DB가 막는다", async () => {
    await store.updateSettings({ langs: { ko: true, en: true } });
    expect((await store.getSettings()).langs).toEqual({ ko: true, en: true });
    await expect(store.updateSettings({ langs: { ko: false, en: false } })).rejects.toThrow();
    expect((await store.getSettings()).langs).toEqual({ ko: true, en: true });
  });

  it("pendingNext 를 넣고 null 로 지운다", async () => {
    await store.updateSettings({ pendingNext: { book: "PSA", chapter: 23 } });
    expect((await store.getSettings()).pendingNext).toEqual({ book: "PSA", chapter: 23 });
    await store.updateSettings({ pendingNext: null });
    expect((await store.getSettings()).pendingNext).toBeUndefined();
  });

  it("빈 patch 는 아무 일도 하지 않는다", async () => {
    await expect(store.updateSettings({})).resolves.toBeUndefined();
  });

  it("전면 광고를 보여 준 날짜를 기록하고 지운다", async () => {
    await store.updateSettings({ lastInterstitialDate: "2026-10-18" });
    expect((await store.getSettings()).lastInterstitialDate).toBe("2026-10-18");
    await store.updateSettings({ lastInterstitialDate: null });
    expect((await store.getSettings()).lastInterstitialDate).toBeUndefined();
  });
});

describe("하루 미션 전체 흐름", () => {
  it("완료하면 기록이 저장되고 다음 미션 장이 다음 장이 된다", async () => {
    await doMission("2026-10-18", "빛이 있게 하소서");
    const log = await store.getDayLog("2026-10-18");
    expect(log).toMatchObject({
      date: "2026-10-18",
      ref: GEN1,
      prayer: "빛이 있게 하소서",
      revived: false,
      readAt: "2026-10-18T01:00:00.000Z",
      completedAt: "2026-10-18T01:05:00.000Z",
    });
    expect((await store.getSettings()).next).toEqual({ book: "GEN", chapter: 2 });
    expect(await store.getStats()).toEqual({ completedDays: 1, grapes: 1, growthDay: 2, savedCount: 0 });
  });

  it("며칠 이어서 하면 장이 하루에 하나씩 넘어간다", async () => {
    await doMission("2026-10-18");
    await doMission("2026-10-19");
    await doMission("2026-10-20");
    const logs = await store.listDayLogs();
    expect(logs.map((l) => `${l.date}:${l.ref.chapter}`)).toEqual([
      "2026-10-18:1",
      "2026-10-19:2",
      "2026-10-20:3",
    ]);
    expect(await store.getStats()).toMatchObject({ completedDays: 3, growthDay: 4 });
  });

  it("23:50에 읽기 시작해 다음 날 00:10에 완료해도 전날 미션이다", async () => {
    const readIso = new Date(2026, 9, 18, 23, 50).toISOString();
    const doneIso = new Date(2026, 9, 19, 0, 10).toISOString();
    await doMission("2026-10-18", "기도", undefined, readIso, doneIso);
    expect((await store.getDayLog("2026-10-18"))?.completedAt).toBe(doneIso);
    expect(await store.getDayLog("2026-10-19")).toBeUndefined();
  });

  it("읽는 곳을 바꿔 두면 다음 미션부터 적용된다", async () => {
    await doMission("2026-10-18");
    await store.updateSettings({ pendingNext: { book: "JHN", chapter: 15 } });
    const s = await store.getSettings();
    const started = startMission("2026-10-19", s, undefined);
    await store.createMissionLog(started.log, started.progress);
    expect((await store.getDayLog("2026-10-19"))?.ref).toEqual({ book: "JHN", chapter: 15 });
    const after = await store.getSettings();
    expect(after.next).toEqual({ book: "JHN", chapter: 15 });
    expect(after.pendingNext).toBeUndefined();
  });

  it("오늘 이미 시작한 뒤 읽는 곳을 바꾸면 오늘은 그대로, 내일부터 적용된다", async () => {
    const s0 = await store.getSettings();
    const started = startMission("2026-10-18", s0, undefined);
    await store.createMissionLog(started.log, started.progress);
    await store.updateSettings({ pendingNext: { book: "JHN", chapter: 15 } });

    const s1 = await store.getSettings();
    const again = startMission("2026-10-18", s1, await store.getDayLog("2026-10-18"));
    expect(again.log.ref).toEqual(GEN1); // 오늘 장은 그대로

    const read = markRead(again.log, "2026-10-18T01:00:00.000Z");
    await store.saveReadAt("2026-10-18", "2026-10-18T01:00:00.000Z");
    const done = completeMission(read, "기도", undefined, "2026-10-18T01:05:00.000Z", s1);
    await store.saveCompletedMission(done.log, done.progress);

    const s2 = await store.getSettings();
    expect(s2.pendingNext).toEqual({ book: "JHN", chapter: 15 });
    const tomorrow = startMission("2026-10-19", s2, undefined);
    expect(tomorrow.log.ref).toEqual({ book: "JHN", chapter: 15 });
  });

  it("읽기 기록 없이 완료를 저장하려 하면 실패하고 진도도 바뀌지 않는다", async () => {
    const s = await store.getSettings();
    const started = startMission("2026-10-18", s, undefined);
    await store.createMissionLog(started.log, started.progress);
    const fake = {
      ...started.log,
      readAt: "2026-10-18T01:00:00.000Z", // 메모리에서만 읽은 척 (DB엔 read_at 없음)
      prayer: "기도",
      completedAt: "2026-10-18T01:05:00.000Z",
    };
    await expect(
      store.saveCompletedMission(fake, { next: { book: "GEN", chapter: 2 } }),
    ).rejects.toThrow();
    expect((await store.getSettings()).next).toEqual(GEN1);
    expect((await store.getDayLog("2026-10-18"))?.completedAt).toBeUndefined();
  });

  it("같은 날 두 번째 완료 저장은 실패한다", async () => {
    const done = await doMission("2026-10-18");
    await expect(
      store.saveCompletedMission(
        { ...done.log, prayer: "또", completedAt: "2026-10-18T05:00:00.000Z" },
        { next: { book: "GEN", chapter: 9 } },
      ),
    ).rejects.toThrow();
    expect((await store.getDayLog("2026-10-18"))?.prayer).toBe("감사합니다");
    expect((await store.getSettings()).next).toEqual({ book: "GEN", chapter: 2 });
  });

  it("createMissionLog 는 이미 있는 날짜를 덮어쓰지 않는다", async () => {
    await doMission("2026-10-18");
    await store.createMissionLog({ date: "2026-10-18", ref: { book: "EXO", chapter: 5 }, revived: false }, {
      next: { book: "EXO", chapter: 5 },
    });
    expect((await store.getDayLog("2026-10-18"))?.ref).toEqual(GEN1);
  });

  it("saveReadAt 은 처음 시각만 남긴다", async () => {
    const s = await store.getSettings();
    const started = startMission("2026-10-18", s, undefined);
    await store.createMissionLog(started.log, started.progress);
    await store.saveReadAt("2026-10-18", "2026-10-18T01:00:00.000Z");
    await store.saveReadAt("2026-10-18", "2026-10-18T09:00:00.000Z");
    expect((await store.getDayLog("2026-10-18"))?.readAt).toBe("2026-10-18T01:00:00.000Z");
  });
});

describe("저장한 구절", () => {
  it("저장 → 목록 → 취소 → 다시 저장", async () => {
    await store.saveVerse(verse(GEN1, 3, "빛이 있으라", "2026-10-18T01:00:00.000Z"));
    await store.saveVerse(verse(GEN1, 5, "첫째 날", "2026-10-18T02:00:00.000Z"));
    expect((await store.listSavedVerses()).map((v) => v.id)).toEqual(["GEN.1.5", "GEN.1.3"]); // 최근 순

    await store.unsaveVerse("GEN.1.3", "2026-10-18T03:00:00.000Z");
    expect((await store.listSavedVerses()).map((v) => v.id)).toEqual(["GEN.1.5"]);
    expect((await store.getStats()).savedCount).toBe(1);

    await store.saveVerse(verse(GEN1, 3, "빛이 있으라(수정)", "2026-10-18T04:00:00.000Z"));
    const list = await store.listSavedVerses();
    expect(list.map((v) => v.id)).toEqual(["GEN.1.3", "GEN.1.5"]);
    expect(list[0].preview).toBe("빛이 있으라(수정)");
  });

  it("한 장 안의 저장 구절만 절 순서로 돌려준다", async () => {
    await store.saveVerse(verse(GEN1, 9));
    await store.saveVerse(verse(GEN1, 3));
    await store.saveVerse(verse({ book: "GEN", chapter: 2 }, 1));
    expect((await store.listSavedVersesInChapter(GEN1)).map((v) => v.verse)).toEqual([3, 9]);
  });

  it("미리보기는 40자까지 (DB 제약)", async () => {
    await expect(store.saveVerse(verse(GEN1, 1, "가".repeat(40)))).resolves.toBeUndefined();
    await expect(store.saveVerse(verse(GEN1, 2, "가".repeat(41)))).rejects.toThrow();
  });

  it("기도에 구절을 연결하면 기록 카드 뷰에 함께 나온다", async () => {
    await store.saveVerse(verse(GEN1, 3, "빛이 있으라"));
    await doMission("2026-10-18", "빛이 있게 하소서", "GEN.1.3");
    const [card] = await db.query("SELECT * FROM v_prayer_cards");
    expect(card).toMatchObject({ date: "2026-10-18", prayer: "빛이 있게 하소서", verse_id: "GEN.1.3", verse: 3, preview: "빛이 있으라" });
  });

  it("없는 구절을 연결하면 미션 완료 전체가 되돌려진다 (외래 키)", async () => {
    const s = await store.getSettings();
    const started = startMission("2026-10-18", s, undefined);
    await store.createMissionLog(started.log, started.progress);
    await store.saveReadAt("2026-10-18", "2026-10-18T01:00:00.000Z");
    const read = markRead(started.log, "2026-10-18T01:00:00.000Z");
    const done = completeMission(read, "기도", "GEN.1.99", "2026-10-18T01:05:00.000Z", started.progress);
    await expect(store.saveCompletedMission(done.log, done.progress)).rejects.toThrow();
    expect((await store.getDayLog("2026-10-18"))?.completedAt).toBeUndefined();
    expect((await store.getSettings()).next).toEqual(GEN1);
  });

  it("연결한 구절을 저장 취소해도 기도는 남고 카드에서 구절만 빠진다", async () => {
    await store.saveVerse(verse(GEN1, 3, "빛이 있으라"));
    await doMission("2026-10-18", "기도", "GEN.1.3");
    await store.unsaveVerse("GEN.1.3", "2026-10-19T00:00:00.000Z");
    const [card] = await db.query("SELECT * FROM v_prayer_cards");
    expect(card).toMatchObject({ prayer: "기도", verse_id: null });
  });
});

describe("놓친 날 되살리기 + 연속 기록 (저장소 연동)", () => {
  const now = new Date(2026, 9, 18, 9, 0); // 10/18 오전 9시
  const today = "2026-10-18";

  const load = async () => {
    const logs = await store.listDayLogs();
    const filled = filledDates(logs.map((l) => ({ date: l.date, completed: !!l.completedAt, revived: l.revived })));
    const revivedAts = await store.listRevivedAtSince(new Date(now.getTime() - 30 * 86_400_000).toISOString());
    return { filled, revivedAts };
  };

  it("어제만 놓친 경우 되살리면 연속이 이어지고 포도알은 늘지 않는다", async () => {
    await doMission("2026-10-15");
    await doMission("2026-10-16");
    // 10/17 놓침
    let { filled, revivedAts } = await load();
    expect(currentStreak(filled, today)).toBe(0);
    expect(canRevive(filled, today, revivedAts, now)).toBe(true);

    const settings = await store.getSettings();
    await store.reviveDay("2026-10-17", settings.next, now.toISOString());

    ({ filled, revivedAts } = await load());
    expect(currentStreak(filled, today)).toBe(3); // 15, 16, 17(되살림)
    expect(canRevive(filled, today, revivedAts, now)).toBe(false);
    expect(await store.getStats()).toMatchObject({ completedDays: 2, grapes: 2, growthDay: 3 }); // 성장 없음
    expect((await store.getSettings()).next).toEqual(settings.next); // 진도도 그대로
  });

  it("되살린 날은 달력에서 revived 상태다", async () => {
    await doMission("2026-10-16");
    await store.reviveDay("2026-10-17", GEN1, now.toISOString());
    const rows = await db.query("SELECT * FROM v_calendar ORDER BY date");
    expect(rows.map((r) => `${r.date}:${r.status}`)).toEqual(["2026-10-16:completed", "2026-10-17:revived"]);
  });

  it("이미 완료한 날은 되살리기가 건드리지 않는다", async () => {
    await doMission("2026-10-17");
    await store.reviveDay("2026-10-17", GEN1, now.toISOString());
    const log = await store.getDayLog("2026-10-17");
    expect(log?.revived).toBe(false);
    expect(log?.completedAt).toBeDefined();
  });

  it("읽다 만 날을 되살릴 수 있다", async () => {
    const s = await store.getSettings();
    const started = startMission("2026-10-17", s, undefined);
    await store.createMissionLog(started.log, started.progress);
    await store.saveReadAt("2026-10-17", "2026-10-17T01:00:00.000Z");
    await store.reviveDay("2026-10-17", s.next, now.toISOString());
    const log = await store.getDayLog("2026-10-17");
    expect(log).toMatchObject({ revived: true, revivedAt: now.toISOString(), completedAt: undefined });
  });

  it("최근 7일 안에 되살린 시각만 목록에 나온다", async () => {
    await store.reviveDay("2026-09-01", GEN1, "2026-09-02T00:00:00.000Z");
    await store.reviveDay("2026-10-10", GEN1, "2026-10-11T00:00:00.000Z");
    const since = new Date(2026, 9, 11, 9, 0).toISOString();
    expect(await store.listRevivedAtSince(since)).toEqual(["2026-10-11T00:00:00.000Z"]);
  });
});
