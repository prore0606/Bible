// 기록 화면의 카드와 탭 규칙 (docs/spec.md 5장 14). 화면은 이 결과만 보여준다.
import type { DayLog, Ref, SavedVerse } from "@/app/types";
import { getBook } from "@/data/books";

export type RecordsTab = "prayer" | "saved";

/** 주소의 ?tab= 값 → 탭. 모르는 값이면 기도 탭. */
export function parseTab(value: string | null | undefined): RecordsTab {
  return value === "saved" ? "saved" : "prayer";
}

/** 구절 위치: 같은 책 안이면 "1:3", 다른 책이면 "요한복음 3:16" */
export function verseRefLabel(verse: SavedVerse, relativeTo?: Ref): string {
  const where = `${verse.ref.chapter}:${verse.verse}`;
  return relativeTo && relativeTo.book === verse.ref.book ? where : `${getBook(verse.ref.book).ko} ${where}`;
}

export type PrayerCard = {
  date: string;
  ref: Ref;
  prayer: string;
  /** 기도에 연결해 둔 구절 (저장을 취소했으면 없음 — 기도는 그대로 남는다) */
  verse?: { preview: string; label: string };
};

/** 완료한 날의 기도 카드. 최근 날짜부터. 연결 구절은 지금 저장돼 있는 것만 붙인다. */
export function prayerCards(logs: readonly DayLog[], saved: readonly SavedVerse[]): PrayerCard[] {
  const byId = new Map(saved.map((v) => [v.id, v]));
  return logs
    .filter((l) => l.completedAt && l.prayer !== undefined)
    .map((l): PrayerCard => {
      const v = l.linkedVerseId ? byId.get(l.linkedVerseId) : undefined;
      return {
        date: l.date,
        ref: l.ref,
        prayer: l.prayer as string,
        verse: v ? { preview: v.preview, label: verseRefLabel(v, l.ref) } : undefined,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** 길게 누르는 동안 손가락이 이만큼(px) 넘게 움직이면 스크롤로 보고 길게 누르기를 취소한다 */
export const LONG_PRESS_MOVE_LIMIT = 10;
/** 길게 누르기로 인정하는 시간(ms) */
export const LONG_PRESS_MS = 550;

export function movedTooFar(dx: number, dy: number, limit: number = LONG_PRESS_MOVE_LIMIT): boolean {
  return Math.hypot(dx, dy) > limit;
}
