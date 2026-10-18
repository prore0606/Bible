// 설정 화면에 보이는 값과 규칙 (docs/spec.md 5장 15). 화면은 이 결과만 보여준다.
import type { Ref, Settings } from "@/app/types";
import { formatRef } from "@/lib/ref";
import { formatTime } from "@/lib/time";

/**
 * 읽는 곳을 바꿀 때 저장할 값. 이미 다음 장으로 잡혀 있는 곳을 고르면 바꿔 둘 것이 없으므로 null(대기 중인 변경을 지운다).
 * 바꾼 곳은 새 미션 로그를 만들 때 적용된다 — 오늘 이미 읽기를 시작했다면 내일부터 (spec 5장 15).
 */
export function pendingFor(chosen: Ref, next: Ref): Ref | null {
  return chosen.book === next.book && chosen.chapter === next.chapter ? null : chosen;
}

/** 설정 줄에 보이는 "읽는 곳": 바꿔 둔 곳이 있으면 그곳, 없으면 다음 장 */
export function readingPlaceLabel(settings: Pick<Settings, "next" | "pendingNext">): string {
  return formatRef(settings.pendingNext ?? settings.next);
}

/** 읽는 곳 바꾸기 시트의 안내 문구 */
export function applyNote(todayStarted: boolean): string {
  return todayStarted
    ? "오늘은 이미 읽기를 시작했어요. 바꾼 곳은 내일 미션부터 적용돼요."
    : "바꾼 곳부터 오늘의 미션을 시작해요.";
}

/** "오전 7:00" */
export function alarmTimeLabel(alarm: Settings["alarm"]): string {
  return formatTime(alarm.hour, alarm.minute);
}

/** "한국어", "English", "한국어 · English" */
export function langLabel(langs: Settings["langs"]): string {
  if (langs.ko && langs.en) return "한국어 · English";
  return langs.en ? "English" : "한국어";
}

/** 앱 정보 화면의 본문 출처 표기 (대한성서공회가 요구한 표기 + KJV) */
export const BIBLE_CREDIT = "성경 본문: 성경전서 개역한글판 (대한성서공회) · King James Version (Public Domain)";
/** 절 번호가 KJV 기준이라는 안내 (docs/bible-data.md 4.2, 결정 D-17) */
export const VERSE_NUMBER_NOTE = "절 번호는 영어 성경(KJV)과 맞추었습니다. 일부 장은 인쇄된 개역한글과 절 번호가 다를 수 있습니다.";
/** 오픈소스 글꼴 표기 (SIL Open Font License 1.1) */
export const FONT_CREDIT = "글꼴: Pretendard, 나눔명조 (SIL Open Font License 1.1)";
