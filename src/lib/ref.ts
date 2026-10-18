// 장 표기와 책·장 고르기 규칙. 화면(BookPicker 등)은 이 함수의 결과만 보여준다.
import type { Ref } from "@/app/types";
import { BOOKS, booksOf, getBook, isBookCode, type BookCode, type Testament } from "@/data/books";

/** "창세기 13장" */
export function formatRef(ref: Ref): string {
  return `${getBook(ref.book).ko} ${ref.chapter}장`;
}

/** 구약/신약 탭을 누르면 그 첫 책 1장으로 (창세기 1장 / 마태복음 1장) */
export function pickTestament(testament: Testament): Ref {
  return { book: booksOf(testament)[0].code, chapter: 1 };
}

/** 책을 바꾸면 장은 1로 초기화 */
export function pickBook(book: BookCode): Ref {
  return { book, chapter: 1 };
}

/** 같은 책에서 장만 바꾼다. 없는 장이면 예외. */
export function pickChapter(ref: Ref, chapter: number): Ref {
  const max = getBook(ref.book).chapters;
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > max) {
    throw new RangeError(`${getBook(ref.book).ko}은 1~${max}장까지 있어요 (입력: ${chapter})`);
  }
  return { book: ref.book, chapter };
}

/** 장 번호 목록 [1..N] */
export function chapterNumbers(book: BookCode): number[] {
  return Array.from({ length: getBook(book).chapters }, (_, i) => i + 1);
}

export const TESTAMENT_LABELS: Record<Testament, string> = {
  OT: `구약 ${booksOf("OT").length}권`,
  NT: `신약 ${booksOf("NT").length}권`,
};

export const DEFAULT_START: Ref = { book: BOOKS[0].code, chapter: 1 };

/**
 * 주소의 ?book=PSA&chapter=23 을 장 위치로 바꾼다. 모르는 책이거나 없는 장이면 undefined —
 * 화면이 책·장 고르기로 돌아간다 (주소를 손으로 고쳐 쓴 경우도 오류 없이 지나간다).
 */
export function parseRefParams(book: string | null | undefined, chapter: string | null | undefined): Ref | undefined {
  if (!book || !chapter || !isBookCode(book) || !/^\d{1,3}$/.test(chapter)) return undefined;
  const n = Number(chapter);
  return n >= 1 && n <= getBook(book).chapters ? { book, chapter: n } : undefined;
}

/** 자유 읽기 주소: /bible/?book=PSA&chapter=23 */
export function bibleHref(ref: Ref): string {
  return `/bible/?book=${ref.book}&chapter=${ref.chapter}`;
}
