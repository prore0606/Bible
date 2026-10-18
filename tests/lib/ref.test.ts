import { describe, expect, it } from "vitest";
import {
  DEFAULT_START,
  TESTAMENT_LABELS,
  bibleHref,
  chapterNumbers,
  formatRef,
  parseRefParams,
  pickBook,
  pickChapter,
  pickTestament,
} from "@/lib/ref";

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

describe("parseRefParams · bibleHref (자유 읽기 주소)", () => {
  it("올바른 책과 장을 읽는다", () => {
    expect(parseRefParams("PSA", "23")).toEqual({ book: "PSA", chapter: 23 });
    expect(parseRefParams("GEN", "1")).toEqual({ book: "GEN", chapter: 1 });
    expect(parseRefParams("1JN", "5")).toEqual({ book: "1JN", chapter: 5 });
  });

  it("없는 책·없는 장·이상한 값은 undefined", () => {
    expect(parseRefParams("XXX", "1")).toBeUndefined();
    expect(parseRefParams("OBA", "2")).toBeUndefined();
    expect(parseRefParams("PSA", "151")).toBeUndefined();
    expect(parseRefParams("PSA", "0")).toBeUndefined();
    expect(parseRefParams("PSA", "-1")).toBeUndefined();
    expect(parseRefParams("PSA", "1.5")).toBeUndefined();
    expect(parseRefParams("PSA", "abc")).toBeUndefined();
    expect(parseRefParams("PSA", "0023")).toBeUndefined();
    expect(parseRefParams(null, "1")).toBeUndefined();
    expect(parseRefParams("PSA", null)).toBeUndefined();
    expect(parseRefParams("gen", "1")).toBeUndefined(); // 코드는 대문자만
  });

  it("bibleHref 와 parseRefParams 는 서로 되돌려진다", () => {
    const ref = { book: "PSA", chapter: 119 } as const;
    expect(bibleHref(ref)).toBe("/bible/?book=PSA&chapter=119");
    const params = new URLSearchParams(bibleHref(ref).split("?")[1]);
    expect(parseRefParams(params.get("book"), params.get("chapter"))).toEqual(ref);
  });
});
