import { describe, expect, it } from "vitest";
import { QUICK_TIMES, WHEEL_MINUTES, formatTime, fromWheel, toWheel } from "@/lib/time";

describe("fromWheel (12시간제 → 24시간제)", () => {
  it("오전 7:00 → 7시, 오후 9:00 → 21시", () => {
    expect(fromWheel({ period: 0, hour12: 7, minute: 0 })).toEqual({ hour: 7, minute: 0 });
    expect(fromWheel({ period: 1, hour12: 9, minute: 0 })).toEqual({ hour: 21, minute: 0 });
  });

  it("오전 12시 = 0시, 오후 12시 = 12시", () => {
    expect(fromWheel({ period: 0, hour12: 12, minute: 0 }).hour).toBe(0);
    expect(fromWheel({ period: 1, hour12: 12, minute: 30 })).toEqual({ hour: 12, minute: 30 });
  });

  it("오전 11시 59분대 · 오후 11시", () => {
    expect(fromWheel({ period: 0, hour12: 11, minute: 55 })).toEqual({ hour: 11, minute: 55 });
    expect(fromWheel({ period: 1, hour12: 11, minute: 55 })).toEqual({ hour: 23, minute: 55 });
  });

  it("범위 밖 시는 예외", () => {
    expect(() => fromWheel({ period: 0, hour12: 0, minute: 0 })).toThrow(RangeError);
    expect(() => fromWheel({ period: 0, hour12: 13, minute: 0 })).toThrow(RangeError);
  });
});

describe("toWheel (24시간제 → 12시간제)", () => {
  it("24시간 모두 fromWheel 과 되돌려진다", () => {
    for (let h = 0; h < 24; h += 1) {
      for (const m of WHEEL_MINUTES) {
        expect(fromWheel(toWheel(h, m))).toEqual({ hour: h, minute: m });
      }
    }
  });

  it("0시는 오전 12시, 12시는 오후 12시", () => {
    expect(toWheel(0, 0)).toEqual({ period: 0, hour12: 12, minute: 0 });
    expect(toWheel(12, 0)).toEqual({ period: 1, hour12: 12, minute: 0 });
    expect(toWheel(13, 5)).toEqual({ period: 1, hour12: 1, minute: 5 });
  });

  it("5분 단위가 아닌 분은 가장 가까운 5분으로 맞춘다", () => {
    expect(toWheel(7, 2).minute).toBe(0);
    expect(toWheel(7, 3).minute).toBe(5);
    expect(toWheel(7, 33).minute).toBe(35);
  });

  it("58분은 다음 시 0분이 되고, 23:58 은 다음 날 0시로 넘어간다", () => {
    expect(toWheel(7, 58)).toEqual({ period: 0, hour12: 8, minute: 0 });
    expect(toWheel(23, 58)).toEqual({ period: 0, hour12: 12, minute: 0 });
    expect(toWheel(11, 58)).toEqual({ period: 1, hour12: 12, minute: 0 });
  });

  it("잘못된 시각은 예외", () => {
    expect(() => toWheel(24, 0)).toThrow(RangeError);
    expect(() => toWheel(7, 60)).toThrow(RangeError);
    expect(() => toWheel(-1, 0)).toThrow(RangeError);
  });
});

describe("formatTime", () => {
  it("오전/오후 표기", () => {
    expect(formatTime(7, 0)).toBe("오전 7:00");
    expect(formatTime(12, 30)).toBe("오후 12:30");
    expect(formatTime(21, 5)).toBe("오후 9:05");
    expect(formatTime(0, 0)).toBe("오전 12:00");
  });
});

describe("상수", () => {
  it("분은 0~55, 5분 단위 12개", () => {
    expect(WHEEL_MINUTES).toHaveLength(12);
    expect(WHEEL_MINUTES[0]).toBe(0);
    expect(WHEEL_MINUTES[11]).toBe(55);
  });

  it("자주 고르는 시간: 아침 7:00, 점심 12:30, 밤 9:00(=21:00)", () => {
    expect(QUICK_TIMES.map((q) => [q.hour, q.minute])).toEqual([
      [7, 0],
      [12, 30],
      [21, 0],
    ]);
  });
});
