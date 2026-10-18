import { describe, expect, it } from "vitest";
import {
  FONT_PX,
  nextFontSize,
  readFraction,
  saveToastText,
  toggleLang,
  verseId,
  visibleRows,
} from "@/lib/reading";
import { pairVerses } from "@/lib/bible";

describe("글자 크기", () => {
  it("작게 15 / 보통 17 / 크게 20 / 아주 크게 24", () => {
    expect(FONT_PX).toEqual({ s: 15, m: 17, l: 20, xl: 24 });
  });

  it("버튼을 누를 때마다 작게 → 보통 → 크게 → 아주 크게 → 작게", () => {
    expect(nextFontSize("s")).toBe("m");
    expect(nextFontSize("m")).toBe("l");
    expect(nextFontSize("l")).toBe("xl");
    expect(nextFontSize("xl")).toBe("s");
  });
});

describe("toggleLang (최소 1개는 켜져 있어야 함)", () => {
  it("영어를 켜면 둘 다 켜진다", () => {
    expect(toggleLang({ ko: true, en: false }, "en")).toEqual({ ko: true, en: true });
  });

  it("둘 다 켜져 있으면 하나씩 끌 수 있다", () => {
    expect(toggleLang({ ko: true, en: true }, "ko")).toEqual({ ko: false, en: true });
    expect(toggleLang({ ko: true, en: true }, "en")).toEqual({ ko: true, en: false });
  });

  it("하나만 켜져 있을 때 그것을 끄려 하면 무시한다", () => {
    const only = { ko: true, en: false };
    expect(toggleLang(only, "ko")).toBe(only);
    const onlyEn = { ko: false, en: true };
    expect(toggleLang(onlyEn, "en")).toBe(onlyEn);
  });

  it("한국어만 → 영어만으로 바꾸려면 영어를 먼저 켠 뒤 한국어를 끈다", () => {
    const both = toggleLang({ ko: true, en: false }, "en");
    expect(toggleLang(both, "ko")).toEqual({ ko: false, en: true });
  });
});

describe("visibleRows", () => {
  const pairs = pairVerses(["가", "나", "다"], ["a", "b"]); // 한국어가 한 절 더 많음

  it("한국어만: 영어 글은 지운다", () => {
    expect(visibleRows(pairs, { ko: true, en: false })).toEqual([
      { verse: 1, ko: "가", en: undefined },
      { verse: 2, ko: "나", en: undefined },
      { verse: 3, ko: "다", en: undefined },
    ]);
  });

  it("영어만: 영어에 없는 절은 빠진다", () => {
    const rows = visibleRows(pairs, { ko: false, en: true });
    expect(rows.map((r) => r.verse)).toEqual([1, 2]);
    expect(rows[0].ko).toBeUndefined();
  });

  it("둘 다: 한쪽에만 있는 절도 보인다", () => {
    const rows = visibleRows(pairs, { ko: true, en: true });
    expect(rows).toHaveLength(3);
    expect(rows[2]).toEqual({ verse: 3, ko: "다", en: undefined });
  });

  it("절 번호는 위치가 아니라 원래 번호를 유지한다", () => {
    const rows = visibleRows(pairVerses(undefined, ["x", "y", "z"]), { ko: false, en: true });
    expect(rows.map((r) => r.verse)).toEqual([1, 2, 3]);
  });
});

describe("verseId · 토스트 문구", () => {
  it("저장 구절 ID 는 DB 제약(book.chapter.verse)과 같은 모양", () => {
    expect(verseId({ book: "GEN", chapter: 1 }, 3)).toBe("GEN.1.3");
    expect(verseId({ book: "1JN", chapter: 5 }, 12)).toBe("1JN.5.12");
  });

  it("저장 / 취소 문구", () => {
    expect(saveToastText({ book: "GEN", chapter: 1 }, 3, true)).toBe("창세기 1:3 저장했어요");
    expect(saveToastText({ book: "PSA", chapter: 23 }, 1, true)).toBe("시편 23:1 저장했어요");
    expect(saveToastText({ book: "GEN", chapter: 1 }, 3, false)).toBe("저장을 취소했어요");
  });
});

describe("readFraction", () => {
  it("0~1 사이로 제한한다", () => {
    expect(readFraction(5, 31)).toBeCloseTo(5 / 31);
    expect(readFraction(31, 31)).toBe(1);
    expect(readFraction(40, 31)).toBe(1);
    expect(readFraction(-1, 31)).toBe(0);
  });

  it("전체가 0이면 0", () => {
    expect(readFraction(0, 0)).toBe(0);
  });
});
