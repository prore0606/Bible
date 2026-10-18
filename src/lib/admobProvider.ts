// 네이티브(AdMob) 광고 제공자 (docs/spec.md 9장). 플러그인은 AdMobApi 뒤에 숨겨서 같은 코드를 테스트에서 가짜로 돌린다.
//
// 플러그인의 동작 방식 (소스 확인):
// - prepare* 는 광고를 불러온 뒤에 성공하고, 불러오지 못하면 실패한다.
// - showInterstitial 은 광고를 띄우는 즉시 끝난다 → 닫힘(Dismissed) 이벤트까지 기다려야 한다.
// - showRewardVideoAd 는 보상을 받았을 때만 끝난다. 중간에 닫으면 끝나지 않으므로 닫힘 이벤트로 마무리한다.
import type { AdProvider } from "@/lib/ads";
import type { AdConfig } from "@/lib/adIds";

type Handle = { remove(): Promise<void> | void };

export type AdEvent =
  | "interstitialDismissed"
  | "interstitialFailedToShow"
  | "rewardEarned"
  | "rewardDismissed"
  | "rewardFailedToShow"
  | "bannerSize"
  | "bannerFailed";

export interface AdMobApi {
  requestConsentInfo(): Promise<{ isConsentFormAvailable: boolean; canRequestAds: boolean; consentRequired: boolean }>;
  showConsentForm(): Promise<{ canRequestAds: boolean }>;
  initialize(): Promise<void>;
  prepareInterstitial(options: { adId: string; isTesting: boolean }): Promise<unknown>;
  showInterstitial(): Promise<unknown>;
  prepareRewardVideoAd(options: { adId: string; isTesting: boolean }): Promise<unknown>;
  showRewardVideoAd(): Promise<unknown>;
  showBanner(options: { adId: string; isTesting: boolean; margin: number }): Promise<unknown>;
  removeBanner(): Promise<unknown>;
  on(event: AdEvent, listener: (data: unknown) => void): Promise<Handle>;
}

/** 광고를 불러오는 데 기다려 주는 최대 시간(보상형). 지나면 "지금은 광고를 불러올 수 없어요" */
export const REWARDED_LOAD_TIMEOUT_MS = 8000;
/** 광고가 닫힘 이벤트를 끝내 보내지 않을 때를 위한 안전장치 */
export const FULLSCREEN_SAFETY_TIMEOUT_MS = 120_000;

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(onTimeout), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function createNativeAdProvider(
  api: AdMobApi,
  config: AdConfig,
  options: { rewardedLoadMs?: number; safetyMs?: number; bannerMargin?: number } = {},
): AdProvider {
  const rewardedLoadMs = options.rewardedLoadMs ?? REWARDED_LOAD_TIMEOUT_MS;
  const safetyMs = options.safetyMs ?? FULLSCREEN_SAFETY_TIMEOUT_MS;
  const bannerMargin = options.bannerMargin ?? 0;
  const isTesting = config.testing;

  // 동의(유럽·영국 등 필요한 곳에서만 화면이 뜬다) → SDK 시작. 성공하면 결과를 기억한다.
  let ready: Promise<boolean> | undefined;
  const ensureReady = (): Promise<boolean> => {
    ready ??= (async () => {
      try {
        let info = await api.requestConsentInfo();
        if (info.consentRequired && info.isConsentFormAvailable) info = { ...info, ...(await api.showConsentForm()) };
        if (!info.canRequestAds) return false;
        await api.initialize();
        return true;
      } catch {
        ready = undefined; // 네트워크가 없었을 수 있으니 다음에 다시 시도한다
        return false;
      }
    })();
    return ready;
  };

  /** 이벤트 중 하나가 올 때까지 기다린다 (리스너는 항상 정리한다) */
  async function untilEvent(events: AdEvent[], start: () => Promise<unknown>): Promise<AdEvent | "timeout"> {
    const handles: Handle[] = [];
    try {
      const registered: Promise<unknown>[] = [];
      const fired = new Promise<AdEvent>((resolve) => {
        for (const event of events) {
          registered.push(api.on(event, () => resolve(event)).then((h) => handles.push(h)));
        }
      });
      // 리스너가 모두 걸린 뒤에 광고를 시작해야 이벤트를 놓치지 않는다
      await Promise.all(registered);
      void start().catch(() => undefined);
      return await withTimeout<AdEvent | "timeout">(fired, safetyMs, "timeout");
    } finally {
      for (const h of handles) void Promise.resolve(h.remove()).catch(() => undefined);
    }
  }

  let interstitial: Promise<boolean> | undefined;
  const loadInterstitial = (): Promise<boolean> =>
    (interstitial = ensureReady()
      .then((ok) => (ok ? api.prepareInterstitial({ adId: config.ids.interstitial, isTesting }).then(() => true) : false))
      .catch(() => false));

  // 배너: 화면에 들어올 때 걸고 나갈 때 걷는다. 걸기를 기다리는 사이에 걷기가 오면(화면을 금방 떠남) 걸지 않는다.
  let bannerToken = 0;
  let bannerHandles: Handle[] = [];
  const dropBannerListeners = () => {
    for (const h of bannerHandles) void Promise.resolve(h.remove()).catch(() => undefined);
    bannerHandles = [];
  };

  return {
    kind: "native",

    prepareInterstitial() {
      void loadInterstitial();
    },

    awaitInterstitialReady() {
      return interstitial ?? loadInterstitial();
    },

    async showInterstitial() {
      const loaded = interstitial ?? loadInterstitial();
      interstitial = undefined; // 한 번 보여 주면 소진된다
      if (!(await loaded)) return;
      await untilEvent(["interstitialDismissed", "interstitialFailedToShow"], () => api.showInterstitial());
    },

    async showRewarded() {
      if (!(await withTimeout(ensureReady(), rewardedLoadMs, false))) return false;
      const loaded = await withTimeout(
        api.prepareRewardVideoAd({ adId: config.ids.rewarded, isTesting }).then(
          () => true,
          () => false,
        ),
        rewardedLoadMs,
        false,
      );
      if (!loaded) return false;

      // 보상은 "보상 지급" 이벤트(또는 show 호출의 결과)가 온 때만 인정한다. 닫힘(Dismissed)은 보상이 아니다.
      let rewarded = false;
      const earned = await api.on("rewardEarned", () => {
        rewarded = true;
      });
      try {
        await untilEvent(["rewardDismissed", "rewardFailedToShow"], () =>
          api.showRewardVideoAd().then(() => {
            rewarded = true;
          }),
        );
      } finally {
        void Promise.resolve(earned.remove()).catch(() => undefined);
      }
      return rewarded;
    },

    async showBanner(onHeight) {
      const token = ++bannerToken;
      if (!(await ensureReady()) || token !== bannerToken) return;
      const handles = await Promise.all([
        api.on("bannerSize", (size) => onHeight(Number((size as { height?: number } | undefined)?.height) || 0)),
        api.on("bannerFailed", () => onHeight(0)),
      ]);
      if (token !== bannerToken) {
        for (const h of handles) void Promise.resolve(h.remove()).catch(() => undefined);
        return;
      }
      bannerHandles = handles;
      try {
        await api.showBanner({ adId: config.ids.banner, isTesting, margin: bannerMargin });
      } catch {
        onHeight(0); // 광고가 안 오면 자리를 접는다
      }
    },

    async removeBanner() {
      bannerToken += 1;
      dropBannerListeners();
      await Promise.resolve(api.removeBanner()).catch(() => undefined);
    },
  };
}
