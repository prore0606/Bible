// 날짜 규칙 (docs/spec.md 7.1): 하루의 기준은 기기 현지 날짜이며 자정에 바뀐다. 키 형식은 YYYY-MM-DD.
// toISOString()은 UTC 기준이라 한국에서 00:00~09:00에 하루 전 날짜가 나오므로 날짜 키에는 쓰지 않는다.

const DAY_MS = 86_400_000;
const KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, "0");

/** 기기 현지 날짜 키. 인자를 생략하면 지금. */
export function toDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 달력에 실제로 있는 날짜인지 (2026-02-30 같은 값은 false). */
export function isDateKey(value: string): boolean {
  if (!KEY_PATTERN.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

function utcMs(key: string): number {
  if (!isDateKey(key)) throw new RangeError(`올바르지 않은 날짜 키: ${key}`);
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** 날짜 키에 n일을 더한다 (음수 가능). 서머타임과 무관하게 달력 기준으로 계산한다. */
export function addDays(key: string, n: number): string {
  const t = new Date(utcMs(key) + n * DAY_MS);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** a - b 를 일 수로. */
export function diffDays(a: string, b: string): number {
  return Math.round((utcMs(a) - utcMs(b)) / DAY_MS);
}
