import { describe, expect, it } from "vitest";
import { addDays, diffDays, isDateKey, toDateKey } from "@/lib/date";

describe("테스트 환경", () => {
  it("한국 시간대(UTC+9)에서 실행된다 — UTC 날짜 버그를 잡으려면 필요", () => {
    expect(new Date().getTimezoneOffset()).toBe(-540);
  });
});

describe("toDateKey", () => {
  it("기기 현지 날짜를 YYYY-MM-DD로 만든다", () => {
    expect(toDateKey(new Date(2026, 9, 18, 14, 30))).toBe("2026-10-18");
  });

  it("한국 새벽 00:05는 UTC로는 전날이지만 현지 날짜를 쓴다", () => {
    const justAfterMidnight = new Date(2026, 0, 1, 0, 5); // 2025-12-31T15:05Z
    expect(justAfterMidnight.toISOString().slice(0, 10)).toBe("2025-12-31");
    expect(toDateKey(justAfterMidnight)).toBe("2026-01-01");
  });

  it("23:59와 00:00 사이에서 날짜가 바뀐다", () => {
    expect(toDateKey(new Date(2026, 9, 18, 23, 59, 59))).toBe("2026-10-18");
    expect(toDateKey(new Date(2026, 9, 19, 0, 0, 0))).toBe("2026-10-19");
  });

  it("한 자리 월·일은 0으로 채운다", () => {
    expect(toDateKey(new Date(2026, 2, 5))).toBe("2026-03-05");
  });
});

describe("isDateKey", () => {
  it("실제 있는 날짜만 true", () => {
    expect(isDateKey("2026-10-18")).toBe(true);
    expect(isDateKey("2028-02-29")).toBe(true); // 윤년
    expect(isDateKey("2026-02-29")).toBe(false);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-13-01")).toBe(false);
    expect(isDateKey("2026-1-1")).toBe(false);
    expect(isDateKey("")).toBe(false);
  });
});

describe("addDays", () => {
  it("월·연 경계를 넘는다", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("윤년 2월을 안다", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("0일과 음수·큰 수를 처리한다", () => {
    expect(addDays("2026-10-18", 0)).toBe("2026-10-18");
    expect(addDays("2026-10-18", -7)).toBe("2026-10-11");
    expect(addDays("2026-01-01", 365)).toBe("2027-01-01");
  });

  it("잘못된 키는 예외를 던진다", () => {
    expect(() => addDays("2026-02-30", 1)).toThrow(RangeError);
  });
});

describe("diffDays", () => {
  it("a - b 를 일 수로 돌려준다", () => {
    expect(diffDays("2026-10-18", "2026-10-17")).toBe(1);
    expect(diffDays("2026-10-17", "2026-10-18")).toBe(-1);
    expect(diffDays("2026-03-01", "2026-02-01")).toBe(28);
    expect(diffDays("2026-10-18", "2026-10-18")).toBe(0);
  });
});
