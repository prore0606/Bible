// 광고 단위 ID 선택 (docs/spec.md 9장). 개발·내부 테스트는 Google 공식 테스트 ID만 쓰고,
// 실제 ID 는 코드가 아니라 환경 설정 파일(.env.local — git 에 올리지 않음)에서 읽어 **출시 빌드에서만** 쓴다.

export type AdIds = { interstitial: string; rewarded: string; banner: string };

export type AdConfig = { ids: AdIds; /** 테스트 광고 ID 를 쓰는 중 */ testing: boolean };

/** Google 공식 Android 테스트 광고 단위 (https://developers.google.com/admob/android/test-ads) */
export const TEST_AD_IDS: AdIds = {
  interstitial: "ca-app-pub-3940256099942544/1033173712",
  rewarded: "ca-app-pub-3940256099942544/5224354917",
  banner: "ca-app-pub-3940256099942544/6300978111",
};

/** Google 공식 테스트 앱 ID — AndroidManifest 의 admob_app_id 에 개발 중 넣어 두는 값 */
export const TEST_APP_ID = "ca-app-pub-3940256099942544~3347511713";

const AD_UNIT_PATTERN = /^ca-app-pub-\d{16}\/\d{10}$/;
const TEST_PUBLISHER = "ca-app-pub-3940256099942544/";

type Env = Record<string, string | undefined>;

/**
 * NEXT_PUBLIC_ADMOB_MODE 가 "production" 이고 세 광고 단위 ID 가 모두 올바른 형식(테스트 ID 아님)일 때만 실제 ID.
 * 하나라도 빠졌거나 틀리면 테스트 ID 로 돌아가서, 설정 실수로 빈 ID·잘못된 ID 가 실제 광고 요청에 나가지 않는다.
 */
export function resolveAdConfig(env: Env): AdConfig {
  if (env.NEXT_PUBLIC_ADMOB_MODE === "production") {
    const ids: AdIds = {
      interstitial: env.NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID ?? "",
      rewarded: env.NEXT_PUBLIC_ADMOB_REWARDED_ID ?? "",
      banner: env.NEXT_PUBLIC_ADMOB_BANNER_ID ?? "",
    };
    const valid = Object.values(ids).every((id) => AD_UNIT_PATTERN.test(id) && !id.startsWith(TEST_PUBLISHER));
    if (valid) return { ids, testing: false };
  }
  return { ids: TEST_AD_IDS, testing: true };
}

/** 지금 빌드의 광고 설정. Next.js 가 NEXT_PUBLIC_ 값을 빌드 때 채워 넣으므로 process.env 를 직접 적는다. */
export const adConfig: AdConfig = resolveAdConfig({
  NEXT_PUBLIC_ADMOB_MODE: process.env.NEXT_PUBLIC_ADMOB_MODE,
  NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID: process.env.NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID,
  NEXT_PUBLIC_ADMOB_REWARDED_ID: process.env.NEXT_PUBLIC_ADMOB_REWARDED_ID,
  NEXT_PUBLIC_ADMOB_BANNER_ID: process.env.NEXT_PUBLIC_ADMOB_BANNER_ID,
});
