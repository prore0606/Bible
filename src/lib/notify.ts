// 알림 계획 (docs/spec.md 8장). 시계·저장소·플러그인을 보지 않는 순수 함수만 둔다.
// 하루 1번, 사용자가 고른 시간에, 오늘 미션을 아직 안 했을 때만 — 앞으로 7일치를 하루 1개씩 미리 예약한다.
import type { Ref } from "@/app/types";
import { addDays, diffDays, toDateKey } from "@/lib/date";
import { MILESTONES, cycleDay, growthDay } from "@/lib/growth";
import { nextRef } from "@/lib/mission";
import { formatRef } from "@/lib/ref";

export const NOTIFICATION_TITLE = "성경-말씀숲";
export const NOTIFICATION_DAYS = 7;

export const MISSED_YESTERDAY_BODY = "어제는 쉬었어요. 오늘 다시 함께 시작해요";
export const WATER_BODY = "알알이가 물을 기다려요. 오늘 1장 읽어 볼까요?";

export type PlannedNotification = {
  /** 날짜(YYYYMMDD)에서 만든 번호. 날짜마다 하나라서 겹치지 않고, 안드로이드가 요구하는 32비트 정수에 들어간다. */
  id: number;
  /** 알림이 울리는 날짜 (YYYY-MM-DD) */
  date: string;
  at: Date;
  title: string;
  body: string;
};

export type NotifyInput = {
  now: Date;
  alarm: { enabled: boolean; hour: number; minute: number };
  /** 오늘 미션을 이미 마쳤는지 */
  todayDone: boolean;
  /** 어제를 놓쳤는지 (되살리기 전) */
  missedYesterday: boolean;
  /** 지금까지 완료한 날 수 */
  completedDays: number;
  /** 첫 알림이 알려 줄 장: 오늘 미션을 마쳤으면 내일 읽을 장, 아니면 오늘 읽을 장 */
  firstRef: Ref;
};

export function notificationId(dateKey: string): number {
  return Number(dateKey.replaceAll("-", ""));
}

function bodyFor(index: number, date: string, input: NotifyInput): string {
  // 어제 놓침 문구는 오늘 알림에만 쓸 수 있다 (먼 날짜는 그날이 되어 봐야 안다)
  if (index === 0 && !input.todayDone && input.missedYesterday) return MISSED_YESTERDAY_BODY;

  // 매일 완료한다고 가정하고, 이 알림의 미션을 마치면 닿는 성장일이 이정표인지 본다
  const day = growthDay(input.completedDays + 1 + index);
  const milestone = MILESTONES.find((m) => m.day === cycleDay(day));
  if (milestone) return `오늘 1장을 읽으면 ${milestone.message}`;

  // 기본 문구는 날짜 기준으로 번갈아 쓴다 (다시 예약해도 같은 날 문구가 바뀌지 않게)
  if (diffDays(date, "2020-01-01") % 2 === 0) {
    let ref = input.firstRef;
    for (let i = 0; i < index; i += 1) ref = nextRef(ref);
    return `오늘의 1장이 기다리고 있어요 · ${formatRef(ref)}`;
  }
  return WATER_BODY;
}

/** 앞으로 7일치 알림. 알림이 꺼져 있으면 빈 목록. */
export function planNotifications(input: NotifyInput): PlannedNotification[] {
  if (!input.alarm.enabled) return [];

  const today = toDateKey(input.now);
  const todayAt = atTime(today, input.alarm.hour, input.alarm.minute);
  // 오늘 미션을 마쳤거나 오늘 알림 시각이 이미 지났으면 내일부터
  const start = !input.todayDone && todayAt.getTime() > input.now.getTime() ? 0 : 1;

  return Array.from({ length: NOTIFICATION_DAYS }, (_, i) => {
    const date = addDays(today, start + i);
    return {
      id: notificationId(date),
      date,
      at: atTime(date, input.alarm.hour, input.alarm.minute),
      title: NOTIFICATION_TITLE,
      // 첫 알림이 오늘 것이 아니면(내일부터) "어제 놓침" 문구를 쓰지 않는다
      body: bodyFor(i, date, start === 0 ? input : { ...input, todayDone: true }),
    };
  });
}

function atTime(dateKey: string, hour: number, minute: number): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}
