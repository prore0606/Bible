// 성경 본문 읽기 (docs/spec.md 6장). 책 1권 = 파일 1개(public/bible/{ko,en}/{BOOK}.json)를 읽을 때만 불러온다.
// 구조: { code, name, chapters: string[][] } — chapters[장-1][절-1] = 본문
import type { Ref } from "@/app/types";
import { getBook, type BookCode } from "@/data/books";

export type Lang = "ko" | "en";

export type BookData = {
  code: BookCode;
  name: string;
  chapters: string[][];
};

/** 책 JSON 을 가져오는 함수. 앱에서는 fetch, 테스트에서는 파일 읽기로 바꿔 끼운다. */
export type BookFetcher = (url: string) => Promise<unknown>;

const defaultFetcher: BookFetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`성경 본문을 불러오지 못했습니다: ${url} (${res.status})`);
  return res.json();
};

const bookUrl = (lang: Lang, code: BookCode) => `/bible/${lang}/${code}.json`;

const cache = new Map<string, Promise<BookData>>();

/** 불러온 파일이 기대한 책인지, 장 수가 books.ts 와 같은지 확인한다 (어긋나면 개발 중에 바로 알아챈다). */
export function assertBookShape(data: unknown, code: BookCode): asserts data is BookData {
  const d = data as Partial<BookData> | null;
  if (!d || d.code !== code || !Array.isArray(d.chapters)) {
    throw new Error(`${code} 본문 파일의 형식이 올바르지 않습니다`);
  }
  const expected = getBook(code).chapters;
  if (d.chapters.length !== expected) {
    throw new Error(`${code} 본문의 장 수가 다릅니다 (파일 ${d.chapters.length}장 / 기대 ${expected}장)`);
  }
  if (d.chapters.some((verses) => !Array.isArray(verses) || verses.length === 0)) {
    throw new Error(`${code} 본문에 비어 있는 장이 있습니다`);
  }
}

/** 책 한 권을 불러온다. 같은 책은 한 번만 가져오고, 실패하면 캐시하지 않아 다시 시도할 수 있다. */
export function loadBook(lang: Lang, code: BookCode, fetcher: BookFetcher = defaultFetcher): Promise<BookData> {
  const key = `${lang}/${code}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const promise = (async () => {
    const data = await fetcher(bookUrl(lang, code));
    assertBookShape(data, code);
    return data;
  })();
  cache.set(key, promise);
  promise.catch(() => cache.delete(key));
  return promise;
}

/** 테스트용: 캐시를 비운다 */
export function clearBibleCache(): void {
  cache.clear();
}

/** 한 장의 본문. verses[절-1] = 본문 */
export async function getChapter(lang: Lang, ref: Ref, fetcher?: BookFetcher): Promise<string[]> {
  const book = await loadBook(lang, ref.book, fetcher);
  const verses = book.chapters[ref.chapter - 1];
  if (!verses) throw new RangeError(`${ref.book} ${ref.chapter}장은 없습니다`);
  return verses;
}

/**
 * 개역한글에는 "(18절에 포함되어 있음)" 처럼, 앞 절에 합쳐진 절을 알리는 문구가 들어 있다.
 * 성경 본문이 아니라 안내이므로 화면에서 흐리게 보이고, 저장·기도 연결 대상에서는 뺀다.
 */
const MERGED_NOTE = /^\(\d+(?:[-~,]\d+)?절에 포함되어 있음\)$/;
export function isMergedVerseNote(text: string): boolean {
  return MERGED_NOTE.test(text.trim());
}

/** 저장한 구절의 미리보기 (DB 제약: 40자 이하). 이모지 등은 한 글자로 센다. */
export const PREVIEW_MAX_LENGTH = 40;
export function previewOf(text: string): string {
  return [...text.trim()].slice(0, PREVIEW_MAX_LENGTH).join("");
}

export type VersePair = { verse: number; ko?: string; en?: string };

/**
 * 한국어·영어 본문을 **절 번호 기준**으로 짝짓는다. 한쪽에만 있는 절은 다른 쪽이 비어 있다
 * (개역한글과 KJV 는 몇몇 장에서 절 수가 달라 위치가 아니라 번호로 맞춰야 한다).
 */
export function pairVerses(ko: readonly string[] | undefined, en: readonly string[] | undefined): VersePair[] {
  const length = Math.max(ko?.length ?? 0, en?.length ?? 0);
  const pairs: VersePair[] = [];
  for (let i = 0; i < length; i += 1) {
    pairs.push({ verse: i + 1, ko: ko?.[i], en: en?.[i] });
  }
  return pairs;
}
