import { describe, expect, it } from "vitest";
import { TEST_AD_IDS } from "@/lib/adIds";
import { createNativeAdProvider, type AdEvent, type AdMobApi } from "@/lib/admobProvider";

type Script = {
  consent?: { required?: boolean; formAvailable?: boolean; canRequestAds?: boolean; formCanRequestAds?: boolean };
  prepareInterstitial?: "ok" | "fail" | "hang";
  prepareReward?: "ok" | "fail" | "hang";
  /** 광고를 보여 줄 때 보낼 이벤트 */
  interstitialShows?: AdEvent[];
  rewardShows?: AdEvent[];
  /** showRewardVideoAd 가 끝나는지 (플러그인은 보상을 받았을 때만 끝난다) */
  rewardShowResolves?: boolean;
  banner?: "ok" | "fail";
};

function fakeApi(script: Script = {}) {
  const calls: string[] = [];
  const listeners = new Map<AdEvent, Set<(d?: unknown) => void>>();
  const emit = (e: AdEvent, data?: unknown) => listeners.get(e)?.forEach((l) => l(data));
  const never = new Promise<never>(() => undefined);
  const api: AdMobApi = {
    async requestConsentInfo() {
      calls.push("consentInfo");
      const c = script.consent ?? {};
      return {
        consentRequired: c.required ?? false,
        isConsentFormAvailable: c.formAvailable ?? true,
        canRequestAds: c.canRequestAds ?? true,
      };
    },
    async showConsentForm() {
      calls.push("consentForm");
      return { canRequestAds: script.consent?.formCanRequestAds ?? true };
    },
    async initialize() {
      calls.push("initialize");
    },
    async prepareInterstitial(o) {
      calls.push(`prepareInterstitial:${o.adId}:${o.isTesting}`);
      if (script.prepareInterstitial === "fail") throw new Error("no fill");
      if (script.prepareInterstitial === "hang") return never;
      return {};
    },
    async showInterstitial() {
      calls.push("showInterstitial");
      for (const e of script.interstitialShows ?? ["interstitialDismissed"]) setTimeout(() => emit(e), 5);
    },
    async prepareRewardVideoAd(o) {
      calls.push(`prepareReward:${o.adId}:${o.isTesting}`);
      if (script.prepareReward === "fail") throw new Error("no fill");
      if (script.prepareReward === "hang") return never;
      return {};
    },
    async showRewardVideoAd() {
      calls.push("showReward");
      for (const e of script.rewardShows ?? ["rewardEarned", "rewardDismissed"]) setTimeout(() => emit(e), 5);
      return script.rewardShowResolves === false ? never : {};
    },
    async showBanner(o) {
      calls.push(`showBanner:${o.adId}:${o.isTesting}:${o.margin}`);
      if (script.banner === "fail") throw new Error("no fill");
      setTimeout(() => emit("bannerSize", { width: 320, height: 50 }), 5);
    },
    async removeBanner() {
      calls.push("removeBanner");
    },
    async on(event, listener) {
      const set = listeners.get(event) ?? new Set<(d?: unknown) => void>();
      set.add(listener);
      listeners.set(event, set);
      return { remove: () => void set.delete(listener) };
    },
  };
  return { api, calls, listeners };
}

const config = { ids: TEST_AD_IDS, testing: true };
const TIMEOUTS = { rewardedLoadMs: 80, safetyMs: 200 };
const make = (script?: Script) => {
  const f = fakeApi(script);
  return { ...f, provider: createNativeAdProvider(f.api, config, TIMEOUTS) };
};

describe("전면 광고", () => {
  it("동의 확인 → 시작 → 테스트 ID 로 불러온 뒤, 닫힐 때까지 기다린다", async () => {
    const { provider, calls } = make();
    provider.prepareInterstitial();
    expect(await provider.awaitInterstitialReady()).toBe(true);
    await provider.showInterstitial();
    expect(calls).toEqual([
      "consentInfo",
      "initialize",
      `prepareInterstitial:${TEST_AD_IDS.interstitial}:true`,
      "showInterstitial",
    ]);
  });

  it("불러오지 못하면 준비 안 됨(false) — 예외를 던지지 않는다", async () => {
    const { provider } = make({ prepareInterstitial: "fail" });
    expect(await provider.awaitInterstitialReady()).toBe(false);
    await expect(provider.showInterstitial()).resolves.toBeUndefined();
  });

  it("동의가 필요한 지역이면 동의 화면을 띄우고, 동의하지 않으면 광고 없이 지나간다", async () => {
    const denied = make({ consent: { required: true, formCanRequestAds: false } });
    expect(await denied.provider.awaitInterstitialReady()).toBe(false);
    expect(denied.calls).toEqual(["consentInfo", "consentForm"]);
    const granted = make({ consent: { required: true, formCanRequestAds: true } });
    expect(await granted.provider.awaitInterstitialReady()).toBe(true);
    expect(granted.calls.slice(0, 3)).toEqual(["consentInfo", "consentForm", "initialize"]);
  });

  it("광고를 보여 주다 실패(FailedToShow)해도 끝난다", async () => {
    const { provider } = make({ interstitialShows: ["interstitialFailedToShow"] });
    await provider.awaitInterstitialReady();
    await expect(provider.showInterstitial()).resolves.toBeUndefined();
  });

  it("닫힘 이벤트가 끝내 오지 않아도 안전장치 시간 뒤에 끝난다", async () => {
    const { provider } = make({ interstitialShows: [] });
    await provider.awaitInterstitialReady();
    await expect(provider.showInterstitial()).resolves.toBeUndefined();
  });

  it("한 번 보여 준 광고는 소진되어 다음에는 새로 불러온다", async () => {
    const { provider, calls } = make();
    await provider.awaitInterstitialReady();
    await provider.showInterstitial();
    await provider.awaitInterstitialReady();
    expect(calls.filter((c) => c.startsWith("prepareInterstitial")).length).toBe(2);
  });

  it("동의 확인이 실패(오프라인)하면 다음 호출에서 다시 시도한다", async () => {
    let fail = true;
    const f = fakeApi();
    const original = f.api.requestConsentInfo;
    f.api.requestConsentInfo = async () => {
      if (fail) throw new Error("offline");
      return original();
    };
    const provider = createNativeAdProvider(f.api, config, TIMEOUTS);
    expect(await provider.awaitInterstitialReady()).toBe(false);
    fail = false;
    provider.prepareInterstitial();
    expect(await provider.awaitInterstitialReady()).toBe(true);
  });
});

describe("보상형 광고", () => {
  it("끝까지 봐서 보상이 지급되면 true", async () => {
    const { provider, calls } = make();
    expect(await provider.showRewarded()).toBe(true);
    expect(calls).toContain(`prepareReward:${TEST_AD_IDS.rewarded}:true`);
  });

  it("보상 없이 중간에 닫으면 false (되살아나지 않는다)", async () => {
    const { provider } = make({ rewardShows: ["rewardDismissed"], rewardShowResolves: false });
    expect(await provider.showRewarded()).toBe(false);
  });

  it("보여 주기에 실패하면 false", async () => {
    const { provider } = make({ rewardShows: ["rewardFailedToShow"], rewardShowResolves: false });
    expect(await provider.showRewarded()).toBe(false);
  });

  it("불러오지 못하거나 시간 안에 준비되지 않으면 false", async () => {
    expect(await make({ prepareReward: "fail" }).provider.showRewarded()).toBe(false);
    expect(await make({ prepareReward: "hang" }).provider.showRewarded()).toBe(false);
  });

  it("동의가 없으면 광고를 요청하지 않고 false", async () => {
    const { provider, calls } = make({ consent: { canRequestAds: false } });
    expect(await provider.showRewarded()).toBe(false);
    expect(calls).toEqual(["consentInfo"]);
  });

  it("끝난 뒤 리스너를 모두 정리한다", async () => {
    const { provider, listeners } = make();
    await provider.showRewarded();
    expect([...listeners.values()].every((s) => s.size === 0)).toBe(true);
  });
});

describe("배너", () => {
  it("동의 확인 후 테스트 배너를 탭바 위 여백과 함께 걸고, 높이를 알린다", async () => {
    const f = fakeApi();
    const provider = createNativeAdProvider(f.api, config, { ...TIMEOUTS, bannerMargin: 62 });
    const heights: number[] = [];
    await provider.showBanner((h) => heights.push(h));
    await new Promise((r) => setTimeout(r, 30));
    expect(f.calls).toEqual(["consentInfo", "initialize", `showBanner:${TEST_AD_IDS.banner}:true:62`]);
    expect(heights).toEqual([50]);
  });

  it("광고가 오지 않으면 높이 0 으로 자리를 접는다", async () => {
    const { provider } = make({ banner: "fail" });
    const heights: number[] = [];
    await provider.showBanner((h) => heights.push(h));
    expect(heights).toEqual([0]);
  });

  it("동의가 없으면 배너를 걸지 않는다", async () => {
    const { provider, calls } = make({ consent: { canRequestAds: false } });
    await provider.showBanner(() => undefined);
    expect(calls).toEqual(["consentInfo"]);
  });

  it("걸기를 기다리는 사이에 걷으면 배너를 걸지 않고, 걷을 때 리스너도 정리한다", async () => {
    const { provider, calls, listeners } = make();
    const shown = provider.showBanner(() => undefined);
    await provider.removeBanner();
    await shown;
    expect(calls).not.toContain(`showBanner:${TEST_AD_IDS.banner}:true:0`);
    expect([...listeners.values()].every((s) => s.size === 0)).toBe(true);
  });

  it("걷기는 배너 제거를 호출하고 리스너를 정리한다", async () => {
    const { provider, calls, listeners } = make();
    await provider.showBanner(() => undefined);
    await provider.removeBanner();
    expect(calls.at(-1)).toBe("removeBanner");
    expect([...listeners.values()].every((s) => s.size === 0)).toBe(true);
  });
});
