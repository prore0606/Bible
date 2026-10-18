// DB 행을 앱에서 쓰는 모양 (docs/spec.md 6장). 0/1 컬럼은 boolean으로 바꿔 쓴다.
import type { BookCode } from "@/data/books";

export type { BookCode };

export type Ref = { book: BookCode; chapter: number };

export type Settings = {
  onboarded: boolean;
  alarm: { enabled: boolean; hour: number; minute: number }; // 24시간제
  langs: { ko: boolean; en: boolean }; // 최소 하나 true
  fontSize: "s" | "m" | "l" | "xl";
  theme: "system" | "light" | "dark";
  next: Ref; // 다음 미션에서 읽을 장
  pendingNext?: Ref; // 설정에서 바꾼 읽는 곳 (다음 미션부터 적용)
  lastInterstitialDate?: string;
};

export type DayLog = {
  date: string; // 'YYYY-MM-DD' — 읽기를 시작한 날짜
  ref: Ref; // 그날 미션 장
  readAt?: string;
  prayer?: string; // 1~100자
  linkedVerseId?: string; // SavedVerse.id
  completedAt?: string;
  revived: boolean; // 보상형 광고로 되살린 날 (읽기 없음)
  revivedAt?: string;
};

export type SavedVerse = {
  id: string; // 'GEN.1.3'
  ref: Ref;
  verse: number;
  preview: string;
  savedAt: string;
};

/** 미션 진도: 다음에 읽을 장과, 설정에서 바꿔 둔 읽는 곳 */
export type Progress = Pick<Settings, "next" | "pendingNext">;
