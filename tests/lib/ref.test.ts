import { describe, expect, it } from "vitest";
import { DEFAULT_START, TESTAMENT_LABELS, chapterNumbers, formatRef, pickBook, pickChapter, pickTestament } from "@/lib/ref";

describe("formatRef", () => {
  it("책 이름과 장", () => {
    expect(formatRef({ book: "GEN", chapter: 13 })).toBe("창세기 13장");
    expect(formatRef({ book: "PSA", chapter: 23 })).toBe("시편 23장");
    expect(formatRef({ book: "REV", chapter: 22 })).toBe("요한계시록 22장");
  });
});

describe("고르기 규칙 (spec 5장 05)", () => {
  it("기본 시작은 창세기 1장", () => {
    expect(DEFAULT_START).toEqual({ book: "GEN", chapter: 1 });
  });

  it("신약 탭 → 마태복음 1장, 구약 탭 → 창세기 1장", () => {
    expect(pickTestament("NT")).toEqual({ book: "MAT", chapter: 1 });
    expect(pickTestament("OT")).toEqual({ book: "GEN", chapter: 1 });
  });

  it("책을 바꾸면 장은 1로 초기화", () => {
    expect(pickBook("PSA")).toEqual({ book: "PSA", chapter: 1 });
  });

  it("장 고르기: 시편 23편", () => {
    expect(pickChapter(pickBook("PSA"), 23)).toEqual({ book: "PSA", chapter: 23 });
  });

  it("없는 장은 예외", () => {
    expect(() => pickChapter({ book: "OBA", chapter: 1 }, 2)).toThrow(RangeError);
    expect(() => pickChapter({ book: "GEN", chapter: 1 }, 0)).toThrow(RangeError);
    expect(() => pickChapter({ book: "PSA", chapter: 1 }, 151)).toThrow(RangeError);
  });

  it("장 번호 목록", () => {
    expect(chapterNumbers("OBA")).toEqual([1]);
    expect(chapterNumbers("PSA")).toHaveLength(150);
    expect(chapterNumbers("PSA")[149]).toBe(150);
  });

  it("탭 이름은 권 수를 포함한다", () => {
    expect(TESTAMENT_LABELS).toEqual({ OT: "구약 39권", NT: "신약 27권" });
  });
});
