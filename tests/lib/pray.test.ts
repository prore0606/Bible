import { describe, expect, it } from "vitest";
import type { DayLog, SavedVerse } from "@/app/types";
import {
  chipLabel,
  completionSummary,
  limitPrayer,
  prayerCounter,
  prayerLength,
  savedOnDate,
  toggleLink,
  validLink,
} from "@/lib/pray";

const verse = (id: string, savedAt: string, over: Partial<SavedVerse> = {}): SavedVerse => {
  const [book, chapter, v] = id.split(".");
  return {
    id,
    ref: { book: book as SavedVerse["ref"]["book"], chapter: Number(chapter) },
    verse: Number(v),
    preview: "빛이 있으라",
    savedAt,
    ...over,
  };
};

describe("글자 수 (100자, 이모지는 한 글자)", () => {
  it("prayerLength", () => {
    expect(prayerLength("")).toBe(0);
    expect(prayerLength("감사합니다")).toBe(5);
    expect(prayerLength("🙏🙏")).toBe(2); // JS length 는 4
  });

  it("limitPrayer: 100자까지만 남긴다", () => {
    const text = "가".repeat(100);
    expect(limitPrayer(text)).toBe(text);
    expect(limitPrayer("가".repeat(130))).toBe("가".repeat(100));
    expect(limitPrayer("짧은 기도")).toBe("짧은 기도");
  });

  it("limitPrayer: 이모지를 반으로 자르지 않는다", () => {
    const cut = limitPrayer("🙏".repeat(120));
    expect([...cut]).toHaveLength(100);
    expect(cut).toBe("🙏".repeat(100));
  });

  it("prayerCounter", () => {
    expect(prayerCounter("")).toBe("0 / 100자");
    expect(prayerCounter("가".repeat(38))).toBe("38 / 100자");
  });
});

describe("savedOnDate (오늘 저장한 구절)", () => {
  const date = "2026-10-18";
  // 한국 시간 기준으로 날짜를 가른다 (테스트는 Asia/Seoul)
  const todayMorning = new Date(2026, 9, 18, 9, 0).toISOString();
  const todayNight = new Date(2026, 9, 18, 23, 59).toISOString();
  const yesterday = new Date(2026, 9, 17, 23, 59).toISOString();
  const tomorrow = new Date(2026, 9, 19, 0, 0).toISOString();

  it("저장한 날짜가 미션 날짜와 같은 구절만, 순서는 그대로", () => {
    const list = [verse("GEN.1.5", todayNight), verse("GEN.1.3", todayMorning), verse("GEN.1.1", yesterday), verse("EXO.1.1", tomorrow)];
    expect(savedOnDate(list, date).map((v) => v.id)).toEqual(["GEN.1.5", "GEN.1.3"]);
  });

  it("다른 장·다른 책의 구절도 포함한다", () => {
    const list = [verse("JHN.3.16", todayMorning), verse("GEN.2.1", todayMorning)];
    expect(savedOnDate(list, date)).toHaveLength(2);
  });

  it("없으면 빈 목록", () => {
    expect(savedOnDate([], date)).toEqual([]);
  });
});

describe("chipLabel", () => {
  const current = { book: "GEN", chapter: 1 } as const;

  it("같은 책이면 장:절 + 미리보기", () => {
    expect(chipLabel(verse("GEN.1.3", "x"), current)).toBe("1:3 빛이 있으라");
  });

  it("다른 책이면 책 이름을 붙인다", () => {
    expect(chipLabel(verse("JHN.3.16", "x", { preview: "하나님이 세상을" }), current)).toBe("요한복음 3:16 하나님이 세상을");
  });
});

describe("toggleLink (구절은 하나만 연결)", () => {
  it("연결 → 해제 → 다른 구절로 바꾸기", () => {
    expect(toggleLink(undefined, "GEN.1.3")).toBe("GEN.1.3");
    expect(toggleLink("GEN.1.3", "GEN.1.3")).toBeUndefined();
    expect(toggleLink("GEN.1.3", "GEN.1.5")).toBe("GEN.1.5");
  });
});

describe("validLink", () => {
  const list = [verse("GEN.1.3", "x")];

  it("목록에 있는 연결만 유지한다", () => {
    expect(validLink("GEN.1.3", list)).toBe("GEN.1.3");
    expect(validLink("GEN.1.9", list)).toBeUndefined();
    expect(validLink(undefined, list)).toBeUndefined();
  });
});

describe("completionSummary", () => {
  it("창세기 1장 · 기도 1줄 · 저장 1개", () => {
    const log: DayLog = { date: "2026-10-18", ref: { book: "GEN", chapter: 1 }, revived: false };
    expect(completionSummary(log, 1)).toBe("창세기 1장 · 기도 1줄 · 저장 1개");
    expect(completionSummary(log, 0)).toBe("창세기 1장 · 기도 1줄 · 저장 0개");
  });
});
