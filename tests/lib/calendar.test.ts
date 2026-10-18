import { describe, expect, it } from "vitest";
import type { DayLog } from "@/app/types";
import { WEEKDAY_LABELS, buildMonth, cellLabel, formatMonthDay, monthOf } from "@/lib/calendar";

const GEN1 = { book: "GEN", chapter: 1 } as const;
const done = (date: string): DayLog => ({ date, ref: GEN1, revived: false, readAt: `${date}T01:00:00Z`, prayer: "기도", completedAt: `${date}T01:05:00Z` });
const revived = (date: string): DayLog => ({ date, ref: GEN1, revived: true, revivedAt: `${date}T09:00:00Z` });
const started = (date: string): DayLog => ({ date, ref: GEN1, revived: false, readAt: `${date}T01:00:00Z` });

describe("monthOf · formatMonthDay", () => {
  it("날짜 키에서 연·월을 꺼내고 '10월 17일'로 쓴다", () => {
    expect(monthOf("2026-10-18")).toEqual({ year: 2026, month: 10 });
    expect(formatMonthDay("2026-10-07")).toBe("10월 7일");
    expect(formatMonthDay("2026-01-31")).toBe("1월 31일");
  });
});

describe("buildMonth: 모양", () => {
  it("일요일에 시작한다: 2026년 10월 1일은 목요일이라 앞에 4칸이 빈다", () => {
    const m = buildMonth(2026, 10, [], "2026-10-18");
    expect(m.cells.slice(0, 4)).toEqual([null, null, null, null]);
    expect(m.cells[4]).toMatchObject({ date: "2026-10-01", day: 1 });
    expect(m.cells).toHaveLength(4 + 31);
  });

  it("월 길이를 안다: 31일, 30일, 평년·윤년 2월", () => {
    const days = (y: number, mo: number) => buildMonth(y, mo, [], "2000-01-01").cells.filter(Boolean).length;
    expect(days(2026, 10)).toBe(31);
    expect(days(2026, 11)).toBe(30);
    expect(days(2026, 2)).toBe(28);
    expect(days(2028, 2)).toBe(29);
  });

  it("1일이 일요일이면 앞이 비지 않는다 (2026년 2월 1일)", () => {
    const m = buildMonth(2026, 2, [], "2026-02-10");
    expect(m.cells[0]).toMatchObject({ date: "2026-02-01" });
  });

  it("1일이 토요일이면 앞이 6칸 빈다 (2025년 3월 1일)", () => {
    const m = buildMonth(2025, 3, [], "2025-03-10");
    expect(m.cells.filter((c) => c === null)).toHaveLength(6);
  });

  it("요일 머리글은 일~토", () => {
    expect([...WEEKDAY_LABELS]).toEqual(["일", "월", "화", "수", "목", "금", "토"]);
  });

  it("잘못된 월은 예외", () => {
    expect(() => buildMonth(2026, 0, [], "2026-10-18")).toThrow(RangeError);
    expect(() => buildMonth(2026, 13, [], "2026-10-18")).toThrow(RangeError);
  });
});

describe("buildMonth: 상태 (spec 5장 14)", () => {
  const logs = [done("2026-10-15"), done("2026-10-16"), revived("2026-10-17"), started("2026-10-14"), done("2026-09-30")];
  const m = buildMonth(2026, 10, logs, "2026-10-18");
  const cell = (day: number) => m.cells.find((c) => c?.day === day)!;

  it("완료한 날 = completed, 되살린 날 = revived", () => {
    expect(cell(15).status).toBe("completed");
    expect(cell(16).status).toBe("completed");
    expect(cell(17).status).toBe("revived");
  });

  it("놓친 날과 읽다 만 날은 빈칸(none)", () => {
    expect(cell(14).status).toBe("none"); // 읽기만 하고 기도를 안 남김
    expect(cell(13).status).toBe("none");
  });

  it("오늘 표시", () => {
    expect(m.cells.filter((c) => c?.isToday).map((c) => c?.date)).toEqual(["2026-10-18"]);
    expect(cell(18).status).toBe("none"); // 오늘 아직 안 했으면 빈칸 + 금색 테두리
  });

  it("다른 달 기록은 섞이지 않고, 이번 달 포도알은 완료한 날만 센다", () => {
    expect(m.completed).toBe(2);
    expect(m.cells.some((c) => c?.date === "2026-09-30")).toBe(false);
  });

  it("오늘 완료했으면 오늘 칸이 completed 이면서 오늘이다", () => {
    const withToday = buildMonth(2026, 10, [done("2026-10-18")], "2026-10-18");
    expect(withToday.cells.find((c) => c?.isToday)).toMatchObject({ status: "completed", isToday: true });
  });

  it("자정을 넘겨 완료한 전날 미션은 전날 칸에 표시된다", () => {
    const m2 = buildMonth(2026, 10, [{ ...done("2026-10-17"), completedAt: "2026-10-18T00:10:00+09:00" }], "2026-10-18");
    expect(m2.cells.find((c) => c?.day === 17)?.status).toBe("completed");
    expect(m2.cells.find((c) => c?.day === 18)?.status).toBe("none");
  });
});

describe("cellLabel (스크린 리더용)", () => {
  it("날짜 + 오늘 + 상태", () => {
    const m = buildMonth(2026, 10, [done("2026-10-17"), revived("2026-10-16"), done("2026-10-18")], "2026-10-18");
    const label = (d: number) => cellLabel(m.cells.find((c) => c?.day === d)!, 10);
    expect(label(17)).toBe("10월 17일 완료");
    expect(label(16)).toBe("10월 16일 되살림");
    expect(label(18)).toBe("10월 18일 오늘, 완료");
    expect(label(15)).toBe("10월 15일");
  });
});
