// 알림 시간 변환 (docs/spec.md 5장 06). 화면은 12시간제 휠(오전/오후 · 1~12시 · 5분 단위), 저장은 24시간제.

/** 휠의 값. period 0 = 오전, 1 = 오후 */
export type WheelTime = { period: 0 | 1; hour12: number; minute: number };

export const MINUTE_STEP = 5;

/** 휠에서 고를 수 있는 분: 0, 5, ..., 55 */
export const WHEEL_MINUTES: readonly number[] = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);

/** 24시간제 시각 → 휠 값. 5분 단위가 아닌 분은 가장 가까운 5분으로 맞춘다(58분 → 다음 시 0분). */
export function toWheel(hour24: number, minute: number): WheelTime {
  assertTime(hour24, minute);
  let h = hour24;
  let m = Math.round(minute / MINUTE_STEP) * MINUTE_STEP;
  if (m === 60) {
    m = 0;
    h = (h + 1) % 24;
  }
  return { period: h >= 12 ? 1 : 0, hour12: h % 12 === 0 ? 12 : h % 12, minute: m };
}

/** 휠 값 → 24시간제. 오전 12시 = 0시, 오후 12시 = 12시. */
export function fromWheel(time: WheelTime): { hour: number; minute: number } {
  if (!Number.isInteger(time.hour12) || time.hour12 < 1 || time.hour12 > 12) {
    throw new RangeError(`시는 1~12 여야 합니다: ${time.hour12}`);
  }
  return { hour: (time.hour12 % 12) + (time.period === 1 ? 12 : 0), minute: time.minute };
}

/** "오전 7:00", "오후 12:30" */
export function formatTime(hour24: number, minute: number): string {
  assertTime(hour24, minute);
  const { period, hour12 } = toWheel(hour24, 0);
  return `${period === 0 ? "오전" : "오후"} ${hour12}:${String(minute).padStart(2, "0")}`;
}

function assertTime(hour: number, minute: number): void {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new RangeError(`올바르지 않은 시각: ${hour}:${minute}`);
  }
}

/** 자주 고르는 시간 (24시간제) */
export const QUICK_TIMES = [
  { label: "아침 7:00", hour: 7, minute: 0 },
  { label: "점심 12:30", hour: 12, minute: 30 },
  { label: "밤 9:00", hour: 21, minute: 0 },
] as const;
