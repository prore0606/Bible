// 홈 화면에 보이는 값 계산 (docs/spec.md 5장 08). 화면은 이 결과만 보여준다.
import type { DayLog, Progress, Ref } from "@/app/types";
import type { MissionStatus } from "@/lib/mission";

/** 오늘 미션 2가지 중 끝낸 개수: 시작 전 0, 읽기 완료 1, 미션 완료 2 */
export function stepsDone(status: MissionStatus): 0 | 1 | 2 {
  return status === "done" ? 2 : status === "read" ? 1 : 0;
}

/** 진행바 너비(%). 0단계에서도 막대가 조금 보이게 4% 를 준다 (screens.html). */
export function progressPercent(status: MissionStatus): number {
  return Math.max(4, (stepsDone(status) / 2) * 100);
}

/**
 * 오늘의 장. 오늘 로그가 있으면 그 장이고, 아직 없으면 지금 시작할 장이다.
 * 설정에서 바꿔 둔 읽는 곳(pendingNext)은 새 로그를 만들 때 적용되므로 그것을 우선한다.
 */
export function todayRef(progress: Progress, log: DayLog | undefined): Ref {
  return log?.ref ?? progress.pendingNext ?? progress.next;
}

/** 미션을 마친 뒤 "내일은 ○○ ○장"에 쓰는 장 (내일 미션이 시작할 곳) */
export function tomorrowRef(progress: Progress): Ref {
  return progress.pendingNext ?? progress.next;
}

/** 인사 배너 문구. 연속 일수가 0이면 첫 열매를 권한다. */
export function greeting(streak: number): { text: string; streak: number | null } {
  return streak > 0
    ? { text: "열매 맺는 중이에요", streak }
    : { text: "오늘 첫 열매를 맺어 볼까요?", streak: null };
}
