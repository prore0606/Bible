// 한 줄 기도 화면과 미션 완료 시트의 규칙 (docs/spec.md 5장 10·12). 화면은 이 함수의 결과만 보여준다.
import type { DayLog, Ref, SavedVerse } from "@/app/types";
import { getBook } from "@/data/books";
import { toDateKey } from "@/lib/date";
import { PRAYER_MAX_LENGTH } from "@/lib/mission";
import { formatRef } from "@/lib/ref";

/** 기도 글자 수. DB(SQLite length)와 같이 이모지 등을 한 글자로 센다. */
export function prayerLength(text: string): number {
  return [...text].length;
}

/** 입력이 100자를 넘으면 100자까지만 남긴다 (붙여넣기 포함). 넘지 않으면 같은 문자열을 돌려준다. */
export function limitPrayer(text: string): string {
  const chars = [...text];
  return chars.length <= PRAYER_MAX_LENGTH ? text : chars.slice(0, PRAYER_MAX_LENGTH).join("");
}

/** "38 / 100자" */
export function prayerCounter(text: string): string {
  return `${prayerLength(text)} / ${PRAYER_MAX_LENGTH}자`;
}

/**
 * "오늘 저장한 구절": 저장한 날짜(기기 현지)가 미션 날짜와 같은 구절. 다른 장의 구절도 포함한다.
 * 최근 저장한 순서를 그대로 유지한다.
 */
export function savedOnDate(verses: readonly SavedVerse[], date: string): SavedVerse[] {
  return verses.filter((v) => toDateKey(new Date(v.savedAt)) === date);
}

/** 구절 칩의 글: 오늘 읽은 책이면 "1:3 빛이 있으라…", 다른 책이면 "요한복음 3:16 하나님이…" */
export function chipLabel(verse: SavedVerse, current: Ref): string {
  const where =
    verse.ref.book === current.book
      ? `${verse.ref.chapter}:${verse.verse}`
      : `${getBook(verse.ref.book).ko} ${verse.ref.chapter}:${verse.verse}`;
  return `${where} ${verse.preview}`;
}

/** 칩을 누르면 연결, 같은 칩을 다시 누르면 해제, 다른 칩을 누르면 그 칩으로 바뀐다 (구절은 하나만 연결) */
export function toggleLink(current: string | undefined, id: string): string | undefined {
  return current === id ? undefined : id;
}

/** 저장 구절을 지웠을 수 있으니, 연결해 둔 구절이 아직 목록에 있을 때만 남긴다 */
export function validLink(linked: string | undefined, available: readonly SavedVerse[]): string | undefined {
  return linked !== undefined && available.some((v) => v.id === linked) ? linked : undefined;
}

/** 미션 완료 시트의 요약: "창세기 1장 · 기도 1줄 · 저장 1개" */
export function completionSummary(log: DayLog, savedCount: number): string {
  return `${formatRef(log.ref)} · 기도 1줄 · 저장 ${savedCount}개`;
}
