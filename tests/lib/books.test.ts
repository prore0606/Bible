import { describe, expect, it } from "vitest";
import { BOOKS, bookIndex, booksOf, getBook, isBookCode } from "@/data/books";

describe("BOOKS", () => {
  it("66권, 구약 39권 + 신약 27권", () => {
    expect(BOOKS).toHaveLength(66);
    expect(booksOf("OT")).toHaveLength(39);
    expect(booksOf("NT")).toHaveLength(27);
  });

  it("전체 1,189장 (구약 929 + 신약 260)", () => {
    const sum = (list: readonly { chapters: number }[]) => list.reduce((s, b) => s + b.chapters, 0);
    expect(sum(booksOf("OT"))).toBe(929);
    expect(sum(booksOf("NT"))).toBe(260);
    expect(sum(BOOKS)).toBe(1189);
  });

  it("코드는 3글자이고 중복이 없다 (DB의 length(book) = 3 제약)", () => {
    const codes = BOOKS.map((b) => b.code);
    expect(new Set(codes).size).toBe(66);
    for (const code of codes) expect(code).toHaveLength(3);
  });

  it("한국어·영어 이름이 모두 있고 중복이 없다", () => {
    expect(new Set(BOOKS.map((b) => b.ko)).size).toBe(66);
    expect(new Set(BOOKS.map((b) => b.en)).size).toBe(66);
    for (const b of BOOKS) {
      expect(b.ko.length).toBeGreaterThan(0);
      expect(b.en.length).toBeGreaterThan(0);
    }
  });

  it("성경 순서: 창세기로 시작해 요한계시록으로 끝나고, 구약은 말라기, 신약은 마태복음이 경계", () => {
    expect(BOOKS[0].code).toBe("GEN");
    expect(BOOKS[65].code).toBe("REV");
    expect(BOOKS[38].code).toBe("MAL");
    expect(BOOKS[38].testament).toBe("OT");
    expect(BOOKS[39].code).toBe("MAT");
    expect(BOOKS[39].testament).toBe("NT");
  });

  it("대표 책의 장 수", () => {
    expect(getBook("PSA").chapters).toBe(150);
    expect(getBook("GEN").chapters).toBe(50);
    expect(getBook("REV").chapters).toBe(22);
    expect(getBook("OBA").chapters).toBe(1);
    expect(getBook("JHN").ko).toBe("요한복음");
  });

  it("bookIndex · isBookCode", () => {
    expect(bookIndex("GEN")).toBe(0);
    expect(bookIndex("REV")).toBe(65);
    expect(isBookCode("PSA")).toBe(true);
    expect(isBookCode("XXX")).toBe(false);
    expect(isBookCode("")).toBe(false);
  });
});
