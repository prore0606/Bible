// @capacitor-community/admob 플러그인을 AdMobApi(admobProvider.ts) 모양에 맞춰 주는 얇은 어댑터.
// 규칙은 admobProvider.ts 에 있고, 여기는 플러그인 호출과 이벤트 이름만 연결한다. 앱(네이티브)에서만 호출된다.
import {
  AdMob,
  AdmobConsentStatus,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
} from "@capacitor-community/admob";
import type { AdEvent, AdMobApi } from "@/lib/admobProvider";

const EVENT_NAMES: Record<AdEvent, string> = {
  interstitialDismissed: InterstitialAdPluginEvents.Dismissed,
  interstitialFailedToShow: InterstitialAdPluginEvents.FailedToShow,
  rewardEarned: RewardAdPluginEvents.Rewarded,
  rewardDismissed: RewardAdPluginEvents.Dismissed,
  rewardFailedToShow: RewardAdPluginEvents.FailedToShow,
  bannerSize: BannerAdPluginEvents.SizeChanged,
  bannerFailed: BannerAdPluginEvents.FailedToLoad,
};

export function createAdMobApi(): AdMobApi {
  return {
    async requestConsentInfo() {
      const info = await AdMob.requestConsentInfo();
      return {
        isConsentFormAvailable: info.isConsentFormAvailable === true,
        canRequestAds: info.canRequestAds,
        consentRequired: info.status === AdmobConsentStatus.REQUIRED,
      };
    },
    async showConsentForm() {
      const info = await AdMob.showConsentForm();
      return { canRequestAds: info.canRequestAds };
    },
    initialize: () => AdMob.initialize(),
    prepareInterstitial: (o: { adId: string; isTesting: boolean }) => AdMob.prepareInterstitial(o),
    showInterstitial: () => AdMob.showInterstitial(),
    prepareRewardVideoAd: (o: { adId: string; isTesting: boolean }) => AdMob.prepareRewardVideoAd(o),
    showRewardVideoAd: () => AdMob.showRewardVideoAd(),
    // 320×50 고정 배너 (기록 화면 하단 여백 계산이 단순하다)
    showBanner: (o: { adId: string; isTesting: boolean; margin: number }) =>
      AdMob.showBanner({ adId: o.adId, isTesting: o.isTesting, margin: o.margin, adSize: BannerAdSize.BANNER, position: BannerAdPosition.BOTTOM_CENTER }),
    removeBanner: () => AdMob.removeBanner(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 플러그인의 addListener 는 이벤트마다 오버로드라서 이름 문자열로 한 번에 건다
    on: (event, listener) => (AdMob as any).addListener(EVENT_NAMES[event], listener),
  };
}
