import { describe, expect, it } from "vitest";
import { EXIT_WINDOW_MS, backAction, shouldExit } from "@/lib/backButton";

describe("backAction", () => {
  it("읽기·기도·완료에서는 확인 창 없이 홈으로", () => {
    expect(backAction("/read/")).toBe("home");
    expect(backAction("/pray/")).toBe("home");
    expect(backAction("/done/")).toBe("home");
  });

  it("탭 화면에서는 두 번 눌러 종료", () => {
    for (const p of ["/home/", "/vineyard/", "/records/", "/bible/"]) expect(backAction(p)).toBe("exit-guard");
  });

  it("성경 탭에서 책을 고른 뒤(자유 읽기)에는 전 화면으로", () => {
    expect(backAction("/bible/", "?book=PSA&chapter=23")).toBe("history");
    expect(backAction("/bible/", "?chapter=2")).toBe("exit-guard");
  });

  it("광고 중과 첫 씨앗에서는 무시", () => {
    expect(backAction("/ad/")).toBe("ignore");
    expect(backAction("/seed/")).toBe("ignore");
  });

  it("첫 실행 입구(스플래시)는 두 번 눌러 종료, 나머지 화면(설정·시작 설정 등)은 전 화면으로", () => {
    expect(backAction("/")).toBe("exit-guard");
    expect(backAction("/splash/")).toBe("exit-guard");
    for (const p of ["/settings/", "/onboarding/", "/start/", "/setup/book/", "/setup/alarm/"]) expect(backAction(p)).toBe("history");
  });
});

describe("shouldExit", () => {
  it("처음 누르면 종료하지 않고, 안내 시간 안에 다시 누르면 종료", () => {
    expect(shouldExit(undefined, 1000)).toBe(false);
    expect(shouldExit(1000, 1000 + EXIT_WINDOW_MS)).toBe(true);
    expect(shouldExit(1000, 1000 + EXIT_WINDOW_MS + 1)).toBe(false);
  });
});
