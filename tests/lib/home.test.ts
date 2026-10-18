import { describe, expect, it } from "vitest";
import type { DayLog } from "@/app/types";
import { greeting, isWilted, progressPercent, stepsDone, todayRef, tomorrowRef } from "@/lib/home";

const GEN13 = { book: "GEN", chapter: 13 } as const;
const log = (over: Partial<DayLog> = {}): DayLog => ({ date: "2026-10-18", ref: GEN13, revived: false, ...over });

describe("stepsDone · progressPercent", () => {
  it("시작 전 0, 읽기 완료 1, 미션 완료 2", () => {
    expect(stepsDone("before")).toBe(0);
    expect(stepsDone("read")).toBe(1);
    expect(stepsDone("done")).toBe(2);
  });

  it("진행바: 0단계도 4% 는 보이고, 1단계 50%, 2단계 100%", () => {
    expect(progressPercent("before")).toBe(4);
    expect(progressPercent("read")).toBe(50);
    expect(progressPercent("done")).toBe(100);
  });
});

describe("todayRef", () => {
  it("오늘 로그가 있으면 그 장", () => {
    expect(todayRef({ next: { book: "GEN", chapter: 14 } }, log())).toEqual(GEN13);
  });

  it("로그가 없으면 다음 장", () => {
    expect(todayRef({ next: GEN13 }, undefined)).toEqual(GEN13);
  });

  it("로그가 없고 바꿔 둔 읽는 곳이 있으면 그곳 (새 미션을 만들 때 적용되므로)", () => {
    expect(todayRef({ next: GEN13, pendingNext: { book: "PSA", chapter: 23 } }, undefined)).toEqual({
      book: "PSA",
      chapter: 23,
    });
  });

  it("오늘 이미 시작했다면 바꿔 둔 읽는 곳은 내일부터", () => {
    expect(todayRef({ next: GEN13, pendingNext: { book: "PSA", chapter: 23 } }, log())).toEqual(GEN13);
  });
});

describe("tomorrowRef", () => {
  it("내일 미션의 장: 바꿔 둔 곳이 있으면 그곳, 없으면 다음 장", () => {
    expect(tomorrowRef({ next: { book: "GEN", chapter: 14 } })).toEqual({ book: "GEN", chapter: 14 });
    expect(tomorrowRef({ next: GEN13, pendingNext: { book: "JHN", chapter: 3 } })).toEqual({ book: "JHN", chapter: 3 });
  });
});

describe("greeting", () => {
  it("연속 일수가 있으면 N일째 열매 맺는 중", () => {
    expect(greeting(12)).toEqual({ text: "열매 맺는 중이에요", streak: 12 });
  });

  it("0이면 첫 열매를 권한다", () => {
    expect(greeting(0)).toEqual({ text: "오늘 첫 열매를 맺어 볼까요?", streak: null });
  });
});

describe("isWilted (어제를 놓쳤을 때 잎이 처짐)", () => {
  it("어제를 놓쳤고 오늘 미션을 아직 안 마쳤으면 처진다 (시작 전·읽기 완료 모두)", () => {
    expect(isWilted(true, "before")).toBe(true);
    expect(isWilted(true, "read")).toBe(true);
  });

  it("오늘 미션을 마치면 바로 회복된다", () => {
    expect(isWilted(true, "done")).toBe(false);
  });

  it("어제를 놓치지 않았으면 처지지 않는다", () => {
    expect(isWilted(false, "before")).toBe(false);
    expect(isWilted(false, "done")).toBe(false);
  });
});
