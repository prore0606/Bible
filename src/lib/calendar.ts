// 기록 화면의 이번 달 달력 (docs/spec.md 5장 14). 화면은 이 결과만 그린다.
// 완료한 날 = 포도, 되살린 날 = 테두리만, 놓친 날 = 빈칸, 오늘 = 금색 테두리. 한 주는 일요일에 시작한다(결정 D-10).
import type { DayLog } from "@/app/types";

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export type DayStatus = "completed" | "revived" | "none";

export type CalendarCell = { date: string; day: number; status: DayStatus; isToday: boolean };

export type MonthView = {
  year: number;
  month: number; // 1~12
  /** 1일이 시작하는 요일 칸(0=일요일)만큼 앞을 null 로 비운 칸 목록 */
  cells: (CalendarCell | null)[];
  /** 이 달에 완료한 날 수 = 이번 달 맺은 포도알 */
  completed: number;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** 날짜 키('YYYY-MM-DD')에서 연·월을 꺼낸다 */
export function monthOf(dateKey: string): { year: number; month: number } {
  const [year, month] = dateKey.split("-").map(Number);
  return { year, month };
}

/** "10월 17일" */
export function formatMonthDay(dateKey: string): string {
  const [, month, day] = dateKey.split("-").map(Number);
  return `${month}월 ${day}일`;
}

export function buildMonth(year: number, month: number, logs: readonly DayLog[], today: string): MonthView {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError(`월은 1~12 여야 합니다: ${month}`);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const byDate = new Map(logs.map((l) => [l.date, l]));

  const cells: (CalendarCell | null)[] = Array.from({ length: offset }, () => null);
  let completed = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${pad(month)}-${pad(day)}`;
    const log = byDate.get(date);
    const status: DayStatus = log?.completedAt ? "completed" : log?.revived ? "revived" : "none";
    if (status === "completed") completed += 1;
    cells.push({ date, day, status, isToday: date === today });
  }
  return { year, month, cells, completed };
}

/** 칸에 붙이는 설명 (스크린 리더용): "10월 17일 오늘, 완료" */
export function cellLabel(cell: CalendarCell, month: number): string {
  const status = cell.status === "completed" ? "완료" : cell.status === "revived" ? "되살림" : "";
  return [`${month}월 ${cell.day}일`, cell.isToday ? "오늘" : "", status].filter(Boolean).join(" ").replace(/오늘 (완료|되살림)/, "오늘, $1");
}
