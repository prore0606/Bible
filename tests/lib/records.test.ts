import { describe, expect, it } from "vitest";
import type { DayLog, SavedVerse } from "@/app/types";
import { LONG_PRESS_MOVE_LIMIT, movedTooFar, parseTab, prayerCards, verseRefLabel } from "@/lib/records";

const saved = (id: string, preview = "빛이 있으라"): SavedVerse => {
  const [book, chapter, verse] = id.split(".");
  return { id, ref: { book: book as SavedVerse["ref"]["book"], chapter: Number(chapter) }, verse: Number(verse), preview, savedAt: "2026-10-18T01:00:00.000Z" };
};
const log = (date: string, over: Partial<DayLog> = {}): DayLog => ({
  date,
  ref: { book: "GEN", chapter: 1 },
  revived: false,
  readAt: `${date}T01:00:00Z`,
  prayer: `${date} 기도`,
  completedAt: `${date}T01:05:00Z`,
  ...over,
});

describe("parseTab", () => {
  it("saved 만 저장한 구절 탭, 나머지는 기도 탭", () => {
    expect(parseTab("saved")).toBe("saved");
    expect(parseTab("prayer")).toBe("prayer");
    expect(parseTab(null)).toBe("prayer");
    expect(parseTab("아무거나")).toBe("prayer");
  });
});

describe("verseRefLabel", () => {
  it("같은 책이면 장:절, 다른 책이면 책 이름을 붙인다", () => {
    const v = saved("GEN.1.3");
    expect(verseRefLabel(v, { book: "GEN", chapter: 1 })).toBe("1:3");
    expect(verseRefLabel(saved("JHN.3.16"), { book: "GEN", chapter: 1 })).toBe("요한복음 3:16");
  });

  it("기준이 없으면 항상 책 이름을 붙인다 (저장한 구절 목록)", () => {
    expect(verseRefLabel(saved("GEN.1.3"))).toBe("창세기 1:3");
  });
});

describe("prayerCards", () => {
  it("완료한 날만, 최근 날짜부터", () => {
    const cards = prayerCards([log("2026-10-15"), log("2026-10-17"), log("2026-10-16")], []);
    expect(cards.map((c) => c.date)).toEqual(["2026-10-17", "2026-10-16", "2026-10-15"]);
  });

  it("읽다 만 날과 되살린 날은 카드가 없다", () => {
    const logs = [
      log("2026-10-15"),
      log("2026-10-16", { completedAt: undefined, prayer: undefined }), // 읽기만 함
      { date: "2026-10-17", ref: { book: "GEN", chapter: 1 }, revived: true, revivedAt: "x" } as DayLog,
    ];
    expect(prayerCards(logs, []).map((c) => c.date)).toEqual(["2026-10-15"]);
  });

  it("연결한 구절이 지금 저장돼 있으면 함께 보여 준다", () => {
    const [card] = prayerCards([log("2026-10-18", { linkedVerseId: "GEN.1.3" })], [saved("GEN.1.3", "빛이 있으라 하시매")]);
    expect(card.verse).toEqual({ preview: "빛이 있으라 하시매", label: "1:3" });
    expect(card.prayer).toBe("2026-10-18 기도");
  });

  it("연결한 구절의 저장을 취소했으면 구절만 빠지고 기도는 남는다", () => {
    const [card] = prayerCards([log("2026-10-18", { linkedVerseId: "GEN.1.3" })], []);
    expect(card.verse).toBeUndefined();
    expect(card.prayer).toBe("2026-10-18 기도");
  });

  it("연결하지 않았으면 구절이 없다", () => {
    expect(prayerCards([log("2026-10-18")], [saved("GEN.1.3")])[0].verse).toBeUndefined();
  });

  it("다른 책 구절을 연결했으면 책 이름이 붙는다", () => {
    const [card] = prayerCards([log("2026-10-18", { linkedVerseId: "JHN.3.16" })], [saved("JHN.3.16", "하나님이 세상을")]);
    expect(card.verse?.label).toBe("요한복음 3:16");
  });

  it("원본 목록을 바꾸지 않는다", () => {
    const logs = [log("2026-10-15"), log("2026-10-17")];
    prayerCards(logs, []);
    expect(logs.map((l) => l.date)).toEqual(["2026-10-15", "2026-10-17"]);
  });
});

describe("movedTooFar (길게 누르다가 스크롤하면 취소)", () => {
  it("한계 안에서 움직이면 계속, 넘으면 취소", () => {
    expect(movedTooFar(0, 0)).toBe(false);
    expect(movedTooFar(6, 6)).toBe(false); // 약 8.5px
    expect(movedTooFar(0, LONG_PRESS_MOVE_LIMIT)).toBe(false);
    expect(movedTooFar(8, 8)).toBe(true); // 약 11.3px
    expect(movedTooFar(-30, 0)).toBe(true);
  });
});
