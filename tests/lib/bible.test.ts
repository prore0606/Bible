import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BOOKS, getBook } from "@/data/books";
import {
  PREVIEW_MAX_LENGTH,
  assertBookShape,
  clearBibleCache,
  getChapter,
  isMergedVerseNote,
  loadBook,
  pairVerses,
  previewOf,
  type BookData,
  type BookFetcher,
  type Lang,
} from "@/lib/bible";

const BIBLE_DIR = join(process.cwd(), "public", "bible");
const readBook = (lang: Lang, code: string): BookData =>
  JSON.parse(readFileSync(join(BIBLE_DIR, lang, `${code}.json`), "utf8"));

// 앱의 fetch 대신 public/bible 파일을 직접 읽는다
const fileFetcher: BookFetcher = async (url) => {
  const m = /^\/bible\/(ko|en)\/([0-9A-Z]{3})\.json$/.exec(url);
  if (!m) throw new Error(`예상하지 못한 주소: ${url}`);
  return readBook(m[1] as Lang, m[2]);
};

beforeEach(() => clearBibleCache());

describe("본문 파일 전체 (public/bible)", () => {
  const all = (lang: Lang) => BOOKS.map((b) => readBook(lang, b.code));

  it.each(["ko", "en"] as const)("%s: 66권 모두 있고 books.ts 와 코드·이름·장 수가 같다", (lang) => {
    for (const b of BOOKS) {
      const data = readBook(lang, b.code);
      expect(data.code).toBe(b.code);
      expect(data.name).toBe(lang === "ko" ? b.ko : b.en);
      expect(data.chapters).toHaveLength(b.chapters);
      expect(() => assertBookShape(data, b.code)).not.toThrow();
    }
  });

  it("전체 장 수는 1,189장", () => {
    for (const lang of ["ko", "en"] as const) {
      const chapters = all(lang).reduce((s, b) => s + b.chapters.length, 0);
      expect(chapters).toBe(1189);
    }
  });

  it("절 수: 개역한글 31,101 / KJV 31,102", () => {
    const verses = (lang: Lang) => all(lang).reduce((s, b) => s + b.chapters.reduce((t, c) => t + c.length, 0), 0);
    expect(verses("ko")).toBe(31101);
    expect(verses("en")).toBe(31102);
  });

  it("빈 절이나 앞뒤 공백이 붙은 절이 없다", () => {
    for (const lang of ["ko", "en"] as const) {
      for (const b of all(lang)) {
        b.chapters.forEach((verses, ci) =>
          verses.forEach((text, vi) => {
            if (!text || text !== text.trim()) throw new Error(`${lang} ${b.code} ${ci + 1}:${vi + 1} 본문 이상: "${text}"`);
          }),
        );
      }
    }
  });

  it("한·영 절 수가 다른 장은 알려진 5곳뿐이다 (짝이 비는 곳)", () => {
    const diffs: string[] = [];
    for (const b of BOOKS) {
      const ko = readBook("ko", b.code);
      const en = readBook("en", b.code);
      ko.chapters.forEach((verses, i) => {
        if (verses.length !== en.chapters[i].length) diffs.push(`${b.code} ${i + 1}: ${verses.length}/${en.chapters[i].length}`);
      });
    }
    expect(diffs).toEqual(["1SA 30: 30/31", "PSA 72: 19/20", "SNG 6: 14/13", "2CO 13: 13/14", "3JN 1: 15/14"]);
  });

  it("개역한글 안내 문구('N절에 포함되어 있음')는 21곳, KJV 에는 없다", () => {
    const count = (lang: Lang) =>
      all(lang).reduce((s, b) => s + b.chapters.flat().filter(isMergedVerseNote).length, 0);
    expect(count("ko")).toBe(21);
    expect(count("en")).toBe(0);
  });
});

describe("대표 구절 (spec T3 완료 기준)", () => {
  it("창세기 1장은 31절, 1:3 은 개역한글('가라사대')이다 — 개역개정('이르시되')이 아님", async () => {
    const ko = await getChapter("ko", { book: "GEN", chapter: 1 }, fileFetcher);
    const en = await getChapter("en", { book: "GEN", chapter: 1 }, fileFetcher);
    expect(ko).toHaveLength(31);
    expect(en).toHaveLength(31);
    expect(ko[0]).toBe("태초에 하나님이 천지를 창조하시니라");
    expect(ko[2]).toBe("하나님이 가라사대 빛이 있으라 하시매 빛이 있었고");
    expect(ko[2]).not.toContain("이르시되");
    expect(en[2]).toBe("And God said, Let there be light: and there was light.");
  });

  it("시편 119편은 한·영 모두 176절", async () => {
    expect(await getChapter("ko", { book: "PSA", chapter: 119 }, fileFetcher)).toHaveLength(176);
    expect(await getChapter("en", { book: "PSA", chapter: 119 }, fileFetcher)).toHaveLength(176);
  });

  it("요한계시록 22장은 21절이고 마지막 절은 아멘으로 끝난다", async () => {
    const ko = await getChapter("ko", { book: "REV", chapter: 22 }, fileFetcher);
    const en = await getChapter("en", { book: "REV", chapter: 22 }, fileFetcher);
    expect(ko).toHaveLength(21);
    expect(ko[20]).toBe("주 예수의 은혜가 모든 자들에게 있을찌어다 아멘");
    expect(en[20]).toMatch(/Amen\.$/);
  });

  it("짧은 장과 1장짜리 책: 시편 117편 2절, 유다서 1장", async () => {
    expect(await getChapter("ko", { book: "PSA", chapter: 117 }, fileFetcher)).toHaveLength(2);
    expect(getBook("JUD").chapters).toBe(1);
    expect(await getChapter("ko", { book: "JUD", chapter: 1 }, fileFetcher)).toHaveLength(25);
  });

  it("요한복음 3:16", async () => {
    const ko = await getChapter("ko", { book: "JHN", chapter: 3 }, fileFetcher);
    expect(ko[15]).toBe("하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니 이는 저를 믿는 자마다 멸망치 않고 영생을 얻게 하려 하심이니라");
  });

  it("대한성서공회 표기로 교정한 3곳이 반영돼 있다 (scripts/build-bible.mjs 의 KRV_FIXES)", async () => {
    const num = await getChapter("ko", { book: "NUM", chapter: 18 }, fileFetcher);
    const deu = await getChapter("ko", { book: "DEU", chapter: 9 }, fileFetcher);
    const isa = await getChapter("ko", { book: "ISA", chapter: 48 }, fileFetcher);
    expect(num[10]).toMatch(/^네게 돌릴 것이/);
    expect(deu[11]).toContain("낸 네 백성이");
    expect(isa[12]).toContain("하늘을 폈나니");
  });

  it("manifest 에 출처와 교정 내역이 기록돼 있다", () => {
    const manifest = JSON.parse(readFileSync(join(BIBLE_DIR, "manifest.json"), "utf8"));
    expect(manifest.languages.ko.verses).toBe(31101);
    expect(manifest.languages.en.verses).toBe(31102);
    expect(manifest.source.repository).toBe("https://github.com/crizin/bible-db");
    expect(manifest.source.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(manifest.koFixes).toHaveLength(3);
  });
});

describe("loadBook · getChapter", () => {
  it("같은 책은 한 번만 가져온다 (캐시)", async () => {
    const fetcher = vi.fn(fileFetcher);
    await loadBook("ko", "GEN", fetcher);
    await loadBook("ko", "GEN", fetcher);
    await getChapter("ko", { book: "GEN", chapter: 2 }, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith("/bible/ko/GEN.json");
  });

  it("언어가 다르면 따로 가져온다", async () => {
    const fetcher = vi.fn(fileFetcher);
    await loadBook("ko", "GEN", fetcher);
    await loadBook("en", "GEN", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("동시에 불러도 한 번만 가져온다", async () => {
    const fetcher = vi.fn(fileFetcher);
    await Promise.all([loadBook("ko", "PSA", fetcher), loadBook("ko", "PSA", fetcher), loadBook("ko", "PSA", fetcher)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("실패하면 캐시하지 않아 다시 시도할 수 있다", async () => {
    let fail = true;
    const fetcher: BookFetcher = async (url) => {
      if (fail) throw new Error("네트워크 오류");
      return fileFetcher(url);
    };
    await expect(loadBook("ko", "GEN", fetcher)).rejects.toThrow("네트워크 오류");
    fail = false;
    await expect(loadBook("ko", "GEN", fetcher)).resolves.toMatchObject({ code: "GEN" });
  });

  it("없는 장은 오류", async () => {
    await expect(getChapter("ko", { book: "OBA", chapter: 2 }, fileFetcher)).rejects.toThrow(RangeError);
  });

  it("다른 책 파일이나 장 수가 어긋난 파일은 거부한다", async () => {
    const wrongBook: BookFetcher = async () => readBook("ko", "EXO");
    await expect(loadBook("ko", "GEN", wrongBook)).rejects.toThrow(/형식/);
    const truncated: BookFetcher = async () => ({ ...readBook("ko", "GEN"), chapters: readBook("ko", "GEN").chapters.slice(0, 49) });
    await expect(loadBook("ko", "GEN", truncated)).rejects.toThrow(/장 수가 다릅니다/);
    const emptyChapter: BookFetcher = async () => ({ ...readBook("ko", "RUT"), chapters: [[], ["a"], ["b"], ["c"]] });
    await expect(loadBook("ko", "RUT", emptyChapter)).rejects.toThrow(/비어 있는 장/);
  });
});

describe("isMergedVerseNote", () => {
  it("합쳐진 절 안내 문구만 true", () => {
    expect(isMergedVerseNote("(18절에 포함되어 있음)")).toBe(true);
    expect(isMergedVerseNote("  (1절에 포함되어 있음) ")).toBe(true);
    expect(isMergedVerseNote("태초에 하나님이 천지를 창조하시니라")).toBe(false);
    expect(isMergedVerseNote("(마므레는 곧 헤브론이라)")).toBe(false);
  });
});

describe("previewOf (저장 구절 미리보기)", () => {
  it("40자 이하면 그대로, 넘으면 앞 40자", () => {
    expect(previewOf("짧은 구절")).toBe("짧은 구절");
    const long = "가".repeat(60);
    expect(previewOf(long)).toBe("가".repeat(PREVIEW_MAX_LENGTH));
  });

  it("이모지는 한 글자로 세어 잘리지 않는다", () => {
    const s = "🙏".repeat(50);
    expect([...previewOf(s)]).toHaveLength(40);
    expect(previewOf(s)).toBe("🙏".repeat(40));
  });

  it("실제 본문: 창세기 1:2 의 미리보기는 40자 이하", async () => {
    const ko = await getChapter("ko", { book: "GEN", chapter: 1 }, fileFetcher);
    expect([...previewOf(ko[1])].length).toBeLessThanOrEqual(40);
    expect(ko[1].startsWith(previewOf(ko[1]))).toBe(true);
  });
});

describe("pairVerses", () => {
  it("절 번호 기준으로 한·영을 짝짓는다", () => {
    expect(pairVerses(["가", "나"], ["a", "b"])).toEqual([
      { verse: 1, ko: "가", en: "a" },
      { verse: 2, ko: "나", en: "b" },
    ]);
  });

  it("한쪽이 더 짧으면 그쪽이 빈다 (예: 요한삼서 1장 ko 15절 / en 14절)", async () => {
    const ko = await getChapter("ko", { book: "3JN", chapter: 1 }, fileFetcher);
    const en = await getChapter("en", { book: "3JN", chapter: 1 }, fileFetcher);
    const pairs = pairVerses(ko, en);
    expect(pairs).toHaveLength(15);
    expect(pairs[14].ko).toBeDefined();
    expect(pairs[14].en).toBeUndefined();
  });

  it("한 언어만 있어도 동작한다", () => {
    expect(pairVerses(["가"], undefined)).toEqual([{ verse: 1, ko: "가", en: undefined }]);
    expect(pairVerses(undefined, undefined)).toEqual([]);
  });
});
