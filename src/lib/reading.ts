// 1장 읽기 화면의 규칙 (docs/spec.md 5장 09). 화면은 이 함수의 결과만 보여준다.
import type { Ref, Settings } from "@/app/types";
import { getBook } from "@/data/books";
import type { VersePair } from "@/lib/bible";

export type Langs = Settings["langs"];
export type FontSize = Settings["fontSize"];

/** 글자 크기 설정: 작게 15 / 보통 17 / 크게 20 (px) */
export const FONT_PX: Record<FontSize, number> = { s: 15, m: 17, l: 20 };
export const FONT_LABELS: Record<FontSize, string> = { s: "작게", m: "보통", l: "크게" };

/** 글자 크기 버튼을 누를 때마다 작게 → 보통 → 크게 → 작게 */
export function nextFontSize(size: FontSize): FontSize {
  return size === "s" ? "m" : size === "m" ? "l" : "s";
}

/** 언어 토글. 최소 하나는 켜져 있어야 하므로, 마지막 하나를 끄려는 요청은 무시한다. */
export function toggleLang(langs: Langs, lang: keyof Langs): Langs {
  const next = { ...langs, [lang]: !langs[lang] };
  return next.ko || next.en ? next : langs;
}

export type VerseRow = { verse: number; ko?: string; en?: string };

/**
 * 선택한 언어로 보여 줄 절만 골라 낸다. 고른 언어에 본문이 없는 절(예: 요한삼서 1:15 는 영어에 없음)은 빠지고,
 * 고르지 않은 언어의 글은 지운다.
 */
export function visibleRows(pairs: readonly VersePair[], langs: Langs): VerseRow[] {
  const rows: VerseRow[] = [];
  for (const p of pairs) {
    const ko = langs.ko ? p.ko : undefined;
    const en = langs.en ? p.en : undefined;
    if (ko !== undefined || en !== undefined) rows.push({ verse: p.verse, ko, en });
  }
  return rows;
}

/** 저장한 구절의 ID: 'GEN.1.3' (DB 제약: book || '.' || chapter || '.' || verse) */
export function verseId(ref: Ref, verse: number): string {
  return `${ref.book}.${ref.chapter}.${verse}`;
}

/** 저장·취소 때 뜨는 토스트 문구 */
export function saveToastText(ref: Ref, verse: number, saved: boolean): string {
  return saved ? `${getBook(ref.book).ko} ${ref.chapter}:${verse} 저장했어요` : "저장을 취소했어요";
}

/** 읽기 진행률 (0~1). 본 절 수 / 전체 절 수 */
export function readFraction(seen: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, seen / total));
}
