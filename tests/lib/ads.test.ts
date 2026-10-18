import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INTERSTITIAL_READY_TIMEOUT_MS,
  createMockAdProvider,
  runInterstitialGate,
  runRewardedGate,
  shouldShowInterstitial,
  type AdProvider,
} from "@/lib/ads";

const TODAY = "2026-10-18";

function fakeProvider(over: Partial<AdProvider> = {}): AdProvider & { shown: number } {
  const p = {
    kind: "native" as const,
    shown: 0,
    prepareInterstitial() {},
    awaitInterstitialReady: () => Promise.resolve(true),
    async showInterstitial() {
      p.shown += 1;
    },
    showRewarded: () => Promise.resolve(true),
    ...over,
  };
  return p as AdProvider & { shown: number };
}

describe("shouldShowInterstitial (하루 최대 1번)", () => {
  it("한 번도 안 봤으면 보여 준다", () => {
    expect(shouldShowInterstitial(undefined, TODAY)).toBe(true);
  });

  it("마지막으로 본 날이 오늘이면 건너뛴다", () => {
    expect(shouldShowInterstitial(TODAY, TODAY)).toBe(false);
  });

  it("어제 봤으면 오늘은 다시 보여 준다", () => {
    expect(shouldShowInterstitial("2026-10-17", TODAY)).toBe(true);
  });
});

describe("runInterstitialGate", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("오늘 처음이고 준비돼 있으면 보여 준다", async () => {
    const p = fakeProvider();
    await expect(runInterstitialGate(p, undefined, TODAY)).resolves.toEqual({ shown: true });
    expect(p.shown).toBe(1);
  });

  it("오늘 이미 봤으면 광고 준비도 기다리지 않고 건너뛴다", async () => {
    const ready = vi.fn(() => Promise.resolve(true));
    const p = fakeProvider({ awaitInterstitialReady: ready });
    await expect(runInterstitialGate(p, TODAY, TODAY)).resolves.toEqual({ shown: false });
    expect(ready).not.toHaveBeenCalled();
    expect(p.shown).toBe(0);
  });

  it("3초 안에 준비되지 않으면 건너뛴다", async () => {
    const p = fakeProvider({ awaitInterstitialReady: () => new Promise<boolean>(() => {}) }); // 영영 준비 안 됨
    const result = runInterstitialGate(p, undefined, TODAY);
    await vi.advanceTimersByTimeAsync(INTERSTITIAL_READY_TIMEOUT_MS + 1);
    await expect(result).resolves.toEqual({ shown: false });
    expect(p.shown).toBe(0);
  });

  it("2.9초 만에 준비되면 보여 준다", async () => {
    const p = fakeProvider({
      awaitInterstitialReady: () => new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 2900)),
    });
    const result = runInterstitialGate(p, undefined, TODAY);
    await vi.advanceTimersByTimeAsync(2900);
    await expect(result).resolves.toEqual({ shown: true });
  });

  it("준비 결과가 false 이거나 오류면 건너뛴다", async () => {
    await expect(
      runInterstitialGate(fakeProvider({ awaitInterstitialReady: () => Promise.resolve(false) }), undefined, TODAY),
    ).resolves.toEqual({ shown: false });
    await expect(
      runInterstitialGate(fakeProvider({ awaitInterstitialReady: () => Promise.reject(new Error("load failed")) }), undefined, TODAY),
    ).resolves.toEqual({ shown: false });
  });

  it("보여 주다 오류가 나도 예외를 던지지 않는다 (미션 완료 흐름을 막지 않음)", async () => {
    const p = fakeProvider({ showInterstitial: () => Promise.reject(new Error("show failed")) });
    await expect(runInterstitialGate(p, undefined, TODAY)).resolves.toEqual({ shown: false });
  });

  it("준비되면 타이머를 정리한다 (남아 있는 타이머 없음)", async () => {
    await runInterstitialGate(fakeProvider(), undefined, TODAY);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("createMockAdProvider (웹 개발 모드)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("바로 준비되고, 정해진 시간(기본 1초) 뒤에 끝난다", async () => {
    const p = createMockAdProvider();
    expect(p.kind).toBe("mock");
    await expect(p.awaitInterstitialReady()).resolves.toBe(true);
    let done = false;
    void p.showInterstitial().then(() => (done = true));
    await vi.advanceTimersByTimeAsync(999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });
});

describe("runRewardedGate (놓친 날 되살리기)", () => {
  it("끝까지 봐서 보상이 지급되면 rewarded", async () => {
    await expect(runRewardedGate(fakeProvider({ showRewarded: () => Promise.resolve(true) }))).resolves.toEqual({ rewarded: true });
  });

  it("중간에 닫아 보상이 없으면 rewarded 가 아니다 (되살아나지 않음)", async () => {
    await expect(runRewardedGate(fakeProvider({ showRewarded: () => Promise.resolve(false) }))).resolves.toEqual({ rewarded: false });
  });

  it("불러오지 못하거나 오류가 나도 예외 없이 rewarded: false", async () => {
    await expect(runRewardedGate(fakeProvider({ showRewarded: () => Promise.reject(new Error("no fill")) }))).resolves.toEqual({ rewarded: false });
  });

  it("true 가 아닌 값은 보상으로 치지 않는다", async () => {
    const odd = fakeProvider({ showRewarded: () => Promise.resolve(undefined as unknown as boolean) });
    await expect(runRewardedGate(odd)).resolves.toEqual({ rewarded: false });
  });

  it("웹 모의 광고는 정해진 시간 뒤에 보상을 지급한다", async () => {
    vi.useFakeTimers();
    try {
      const p = createMockAdProvider(1000);
      let rewarded: boolean | undefined;
      void runRewardedGate(p).then((r) => (rewarded = r.rewarded));
      await vi.advanceTimersByTimeAsync(999);
      expect(rewarded).toBeUndefined();
      await vi.advanceTimersByTimeAsync(1);
      expect(rewarded).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
