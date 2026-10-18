import { describe, expect, it } from "vitest";
import { guardTarget, normalizePath } from "@/lib/routeGuard";

describe("normalizePath", () => {
  it("끝의 / 를 없앤다 (루트는 그대로)", () => {
    expect(normalizePath("/home/")).toBe("/home");
    expect(normalizePath("/setup/book/")).toBe("/setup/book");
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("/home")).toBe("/home");
  });
});

describe("guardTarget — 첫 실행 전", () => {
  it("첫 실행 화면은 그대로 열린다", () => {
    for (const p of ["/", "/splash/", "/onboarding/", "/start/", "/setup/book/", "/setup/alarm/", "/seed/"]) {
      expect(guardTarget(p, false)).toBeNull();
    }
  });

  it("그 밖의 화면은 스플래시로 보낸다", () => {
    for (const p of ["/home/", "/read/", "/pray/", "/done/", "/vineyard/", "/records/", "/settings/", "/bible/", "/ad/"]) {
      expect(guardTarget(p, false)).toBe("/splash/");
    }
  });
});

describe("guardTarget — 첫 실행 후", () => {
  it("온보딩·시작하기·시작 설정은 홈으로 보낸다", () => {
    for (const p of ["/onboarding/", "/start/", "/setup/book/", "/setup/alarm/"]) {
      expect(guardTarget(p, true)).toBe("/home/");
    }
  });

  it("스플래시는 열린다 (매 실행의 입구)", () => {
    expect(guardTarget("/splash/", true)).toBeNull();
  });

  it("첫 씨앗은 onboarded 저장 직후에도 열려 있어야 한다", () => {
    expect(guardTarget("/seed/", true)).toBeNull();
  });

  it("일반 화면은 그대로", () => {
    for (const p of ["/home/", "/read/", "/records/", "/settings/", "/bible/"]) {
      expect(guardTarget(p, true)).toBeNull();
    }
  });
});
