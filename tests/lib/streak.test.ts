import { describe, expect, it } from "vitest";
import {
  canRevive,
  currentStreak,
  filledDates,
  missedYesterday,
  type DayFlags,
} from "@/lib/streak";

const TODAY = "2026-10-18";
const NOW = new Date(2026, 9, 18, 9, 0);
const set = (...dates: string[]) => new Set(dates);

describe("filledDates", () => {
  it("완료했거나 되살린 날만 채워진 날이다", () => {
    const logs: DayFlags[] = [
      { date: "2026-10-14", completed: true, revived: false },
      { date: "2026-10-15", completed: false, revived: true },
      { date: "2026-10-16", completed: false, revived: false }, // 읽다 만 날
    ];
    expect([...filledDates(logs)].sort()).toEqual(["2026-10-14", "2026-10-15"]);
  });
});

describe("currentStreak", () => {
  it("기록이 없으면 0", () => {
    expect(currentStreak(set(), TODAY)).toBe(0);
  });

  it("오늘 완료했으면 오늘부터 센다", () => {
    expect(currentStreak(set("2026-10-16", "2026-10-17", "2026-10-18"), TODAY)).toBe(3);
  });

  it("오늘 아직 안 했어도 어제까지 이어졌으면 유지된다", () => {
    expect(currentStreak(set("2026-10-15", "2026-10-16", "2026-10-17"), TODAY)).toBe(3);
  });

  it("어제도 비었으면 0부터 다시 시작한다", () => {
    expect(currentStreak(set("2026-10-14", "2026-10-15", "2026-10-16"), TODAY)).toBe(0);
  });

  it("중간에 빈 날이 있으면 거기서 끊긴다", () => {
    expect(currentStreak(set("2026-10-13", "2026-10-15", "2026-10-16", "2026-10-17"), TODAY)).toBe(3);
  });

  it("되살린 날도 연속에 포함된다", () => {
    const filled = filledDates([
      { date: "2026-10-15", completed: true, revived: false },
      { date: "2026-10-16", completed: false, revived: true },
      { date: "2026-10-17", completed: true, revived: false },
    ]);
    expect(currentStreak(filled, TODAY)).toBe(3);
  });

  it("월·연 경계를 넘어서도 센다", () => {
    expect(currentStreak(set("2026-12-30", "2026-12-31", "2027-01-01"), "2027-01-01")).toBe(3);
  });
});

describe("missedYesterday", () => {
  it("어제 채웠으면 놓친 게 아니다", () => {
    expect(missedYesterday(set("2026-10-16", "2026-10-17"), TODAY)).toBe(false);
  });

  it("어제를 비웠고 그 전에 기록이 있으면 놓친 것", () => {
    expect(missedYesterday(set("2026-10-15", "2026-10-16"), TODAY)).toBe(true);
  });

  it("앱을 처음 쓰는 사람(기록 없음)은 놓친 게 아니다", () => {
    expect(missedYesterday(set(), TODAY)).toBe(false);
  });

  it("오늘 처음 완료한 사람도 놓친 게 아니다", () => {
    expect(missedYesterday(set(TODAY), TODAY)).toBe(false);
  });

  it("오래전 기록만 있어도 어제가 비었으면 놓친 것", () => {
    expect(missedYesterday(set("2026-09-01"), TODAY)).toBe(true);
  });
});

describe("canRevive (docs/spec.md 7.4)", () => {
  it("어제만 놓치고 그제가 채워졌으면 가능", () => {
    expect(canRevive(set("2026-10-15", "2026-10-16"), TODAY, [], NOW)).toBe(true);
  });

  it("이틀 놓쳤으면 불가 (그제가 비어 있음)", () => {
    expect(canRevive(set("2026-10-14", "2026-10-15"), TODAY, [], NOW)).toBe(false);
  });

  it("어제 채웠으면 불가", () => {
    expect(canRevive(set("2026-10-16", "2026-10-17"), TODAY, [], NOW)).toBe(false);
  });

  it("기록이 없으면 불가", () => {
    expect(canRevive(set(), TODAY, [], NOW)).toBe(false);
  });

  it("최근 7일 안에 쓴 적이 있으면 불가", () => {
    const sixDaysAgo = new Date(2026, 9, 12, 9, 0).toISOString();
    expect(canRevive(set("2026-10-15", "2026-10-16"), TODAY, [sixDaysAgo], NOW)).toBe(false);
  });

  it("정확히 7일 전은 아직 쿨다운 안, 8일 전이면 다시 가능", () => {
    const sevenDaysAgo = new Date(2026, 9, 11, 9, 0).toISOString();
    expect(canRevive(set("2026-10-15", "2026-10-16"), TODAY, [sevenDaysAgo], NOW)).toBe(false); // 정확히 7일 전은 아직 7일 안
    const eightDaysAgo = new Date(2026, 9, 10, 9, 0).toISOString();
    expect(canRevive(set("2026-10-15", "2026-10-16"), TODAY, [eightDaysAgo], NOW)).toBe(true);
  });

  it("되살린 날은 채워진 날로 쳐서 그다음 놓침도 이어서 판단한다", () => {
    // 15일 완료, 16일 되살림, 17일 놓침 → 그제(16일)가 되살림으로 채워져 있다
    const filled = set("2026-10-15", "2026-10-16");
    expect(canRevive(filled, TODAY, ["2026-10-17T10:00:00.000Z"], NOW)).toBe(false); // 쿨다운
    expect(canRevive(filled, TODAY, [], NOW)).toBe(true);
  });
});
