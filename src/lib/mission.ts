// 하루 미션 규칙 (docs/spec.md 7.2). 시계와 저장소를 직접 보지 않는 순수 함수만 둔다 —
// 오늘 날짜와 현재 시각은 호출하는 쪽이 넘겨준다.
//
// 자정 넘김(7.1): 미션은 읽기를 시작한 날짜(DayLog.date)에 기록된다. 그래서 completeMission은
// 날짜를 새로 계산하지 않고 로그에 이미 있는 date를 그대로 둔다. 23:50에 읽기를 시작해 00:10에
// 기도를 남겨도 전날 미션으로 완료된다. 단, 읽기→기도 흐름이 끊긴 뒤(앱 종료 등) 다음 날 이어서
// 완료하는 것은 허용하지 않는다 — 그 날은 놓친 날이 되고 오늘은 같은 장으로 새로 시작한다.
import { BOOKS, bookIndex, getBook } from "@/data/books";
import type { DayLog, Progress, Ref } from "@/app/types";

export const PRAYER_MAX_LENGTH = 100;

export type MissionStatus = "before" | "read" | "done";

export class MissionError extends Error {
  constructor(
    readonly code: "NOT_READ" | "INVALID_PRAYER" | "ALREADY_COMPLETED",
    message: string,
  ) {
    super(message);
    this.name = "MissionError";
  }
}

/** 장이 실제로 있는지 (책 코드는 타입이 보장하므로 장 범위만 본다) */
export function isValidRef(ref: Ref): boolean {
  return Number.isInteger(ref.chapter) && ref.chapter >= 1 && ref.chapter <= getBook(ref.book).chapters;
}

/** 다음 장. 책의 마지막 장이면 다음 책 1장, 요한계시록 22장 다음은 창세기 1장. */
export function nextRef(ref: Ref): Ref {
  if (ref.chapter < getBook(ref.book).chapters) {
    return { book: ref.book, chapter: ref.chapter + 1 };
  }
  const nextBook = BOOKS[(bookIndex(ref.book) + 1) % BOOKS.length];
  return { book: nextBook.code, chapter: 1 };
}

/** 오늘 미션 상태 3가지: 시작 전 → 읽기 완료 → 미션 완료 */
export function missionStatus(log: DayLog | undefined): MissionStatus {
  if (!log) return "before";
  if (log.completedAt) return "done";
  if (log.readAt) return "read";
  return "before";
}

/**
 * /read에 들어갈 때 오늘 로그가 없으면 만든다. 이미 있으면 그대로 돌려준다(진도도 그대로).
 * 새로 만들 때 설정에서 바꿔 둔 읽는 곳(pendingNext)이 있으면 먼저 next에 반영하고 지운다.
 * 오늘 이미 읽기를 시작했다면 pendingNext는 남아 내일 미션부터 적용된다.
 */
export function startMission(
  today: string,
  progress: Progress,
  existing: DayLog | undefined,
): { log: DayLog; progress: Progress } {
  if (existing) return { log: existing, progress };

  const next = progress.pendingNext ?? progress.next;
  const log: DayLog = { date: today, ref: next, revived: false };
  return { log, progress: { next } };
}

/** 읽기 완료. 처음 누른 시각만 남긴다. */
export function markRead(log: DayLog, nowIso: string): DayLog {
  if (log.readAt) return log;
  return { ...log, readAt: nowIso };
}

/**
 * 기도문을 다듬는다. 앞뒤 공백을 지우고, 공백 제외 1~100자이면 그 문자열을, 아니면 null.
 * 글자 수는 DB(SQLite length)와 같이 이모지 등을 한 글자로 센다.
 */
export function normalizePrayer(input: string): string | null {
  const text = input.trim();
  const length = [...text].length;
  if (length < 1 || length > PRAYER_MAX_LENGTH) return null;
  return text;
}

export function canComplete(log: DayLog, prayerInput: string): boolean {
  return !log.completedAt && !!log.readAt && normalizePrayer(prayerInput) !== null;
}

/**
 * 미션 완료: 읽기를 마친 로그에 기도와 완료 시각을 기록하고, 다음 미션 장을 다음 장으로 옮긴다.
 * 하루에 미션은 한 번만 완료된다. 로그의 date는 바꾸지 않는다(자정 넘김 규칙).
 */
export function completeMission(
  log: DayLog,
  prayerInput: string,
  linkedVerseId: string | undefined,
  nowIso: string,
  progress: Progress,
): { log: DayLog; progress: Progress } {
  if (log.completedAt) {
    throw new MissionError("ALREADY_COMPLETED", "오늘 미션은 이미 완료했어요");
  }
  if (!log.readAt) {
    throw new MissionError("NOT_READ", "1장을 먼저 읽어야 해요");
  }
  const prayer = normalizePrayer(prayerInput);
  if (prayer === null) {
    throw new MissionError("INVALID_PRAYER", `기도는 공백 제외 1~${PRAYER_MAX_LENGTH}자로 적어 주세요`);
  }

  const completed: DayLog = {
    ...log,
    prayer,
    linkedVerseId,
    completedAt: nowIso,
  };
  return {
    log: completed,
    // pendingNext는 그대로 둔다 — 아직 적용 전이면 내일 미션부터 쓴다
    progress: { ...progress, next: nextRef(log.ref) },
  };
}
