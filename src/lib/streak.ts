// 연속 기록과 놓친 날 되살리기 (docs/spec.md 7.3, 7.4)
import { addDays } from "./date";

export type DayFlags = { date: string; completed: boolean; revived: boolean };

/** 되살리기를 쓴 뒤 다시 쓰려면 지나야 하는 일 수 */
export const REVIVE_COOLDOWN_DAYS = 7;

const DAY_MS = 86_400_000;

/** 채워진 날 = 미션을 완료했거나 되살린 날 */
export function filledDates(logs: readonly DayFlags[]): Set<string> {
  const filled = new Set<string>();
  for (const log of logs) {
    if (log.completed || log.revived) filled.add(log.date);
  }
  return filled;
}

/** 연속 일수: 오늘이 채워졌으면 오늘부터, 아니면 어제부터 거꾸로 센 끊기지 않은 날 수 */
export function currentStreak(filled: ReadonlySet<string>, today: string): number {
  let cursor = filled.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (filled.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

/** 어제를 놓친 상태: 어제가 채워지지 않았고, 그 전에 채워진 날이 하나 이상 있음 */
export function missedYesterday(filled: ReadonlySet<string>, today: string): boolean {
  const yesterday = addDays(today, -1);
  if (filled.has(yesterday)) return false;
  for (const date of filled) {
    if (date < yesterday) return true;
  }
  return false;
}

/**
 * 되살리기 가능 조건: 어제를 놓쳤고, 그제는 채워져 있고, 최근 7일 안에 되살리기를 쓴 적이 없음.
 * @param revivedAts 되살린 시각(ISO 8601) 목록
 */
export function canRevive(
  filled: ReadonlySet<string>,
  today: string,
  revivedAts: readonly string[],
  now: Date,
): boolean {
  if (!missedYesterday(filled, today)) return false;
  if (!filled.has(addDays(today, -2))) return false;
  const since = now.getTime() - REVIVE_COOLDOWN_DAYS * DAY_MS;
  return !revivedAts.some((iso) => Date.parse(iso) >= since);
}
