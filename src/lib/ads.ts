// 광고 규칙 (docs/spec.md 9장). 광고는 읽기·기도 중간에는 절대 나오지 않고, 미션이 끝난 쉼표에서만 하루 1번 나온다.
// 실제 AdMob 연결은 T13 에서 AdProvider 의 네이티브 구현으로 붙이고, 지금은 브라우저용 모의(mock) 구현만 둔다.

/** 전면 광고가 3초 안에 준비되지 않으면 건너뛰고 완료 화면으로 간다 */
export const INTERSTITIAL_READY_TIMEOUT_MS = 3000;
/** 웹 개발 모드에서 "광고 자리" 화면을 보여 주는 시간 */
export const MOCK_AD_DURATION_MS = 1000;

/**
 * 전면 광고는 하루 최대 1번. 마지막으로 보여 준 날짜가 오늘이면 건너뛴다.
 * 기준은 **지금 날짜**이며 미션 날짜가 아니다 (23:50 시작 → 00:10 완료여도 그날 처음이면 보여 준다).
 */
export function shouldShowInterstitial(lastShownDate: string | undefined, today: string): boolean {
  return lastShownDate !== today;
}

export interface AdProvider {
  /** mock = 브라우저의 "광고 자리" 화면, native = AdMob 이 직접 화면을 띄움 */
  readonly kind: "mock" | "native";
  /** /pray 에 들어갈 때 미리 불러오기 시작한다 (기도 저장 직후 지연이 없도록) */
  prepareInterstitial(): void;
  /** 광고가 준비되면 true, 불러오지 못하면 false */
  awaitInterstitialReady(): Promise<boolean>;
  /** 광고를 보여 주고, 닫힐 때까지 기다린다 */
  showInterstitial(): Promise<void>;
  /** 보상형 광고(놓친 날 되살리기). 끝까지 봐서 보상이 지급되면 true, 중간에 닫았거나 불러오지 못하면 false */
  showRewarded(): Promise<boolean>;
}

/**
 * 보상형 광고 관문: 광고를 끝까지 봐야(보상 지급) rewarded = true.
 * 불러오지 못하거나 오류가 나도 예외를 던지지 않고 false 를 돌려주어, 화면이 "지금은 광고를 불러올 수 없어요"로 안내한다.
 */
export async function runRewardedGate(provider: AdProvider): Promise<{ rewarded: boolean }> {
  try {
    return { rewarded: (await provider.showRewarded()) === true };
  } catch {
    return { rewarded: false };
  }
}

export type GateResult = { shown: boolean };

/**
 * 광고 관문: 오늘 이미 봤거나, 3초 안에 준비되지 않았거나, 오류가 나면 광고 없이 지나간다.
 * 어떤 경우에도 예외를 던지지 않아서, 광고 문제가 미션 완료 흐름을 막지 않는다.
 */
export async function runInterstitialGate(
  provider: AdProvider,
  lastShownDate: string | undefined,
  today: string,
  readyTimeoutMs: number = INTERSTITIAL_READY_TIMEOUT_MS,
): Promise<GateResult> {
  if (!shouldShowInterstitial(lastShownDate, today)) return { shown: false };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), readyTimeoutMs);
  });
  let ready = false;
  try {
    ready = await Promise.race([provider.awaitInterstitialReady().catch(() => false), timeout]);
  } finally {
    clearTimeout(timer);
  }
  if (!ready) return { shown: false };

  try {
    await provider.showInterstitial();
    return { shown: true };
  } catch {
    return { shown: false };
  }
}

/** 브라우저(웹 개발 모드)용: 광고 대신 잠깐 기다렸다가 넘어간다 */
export function createMockAdProvider(durationMs: number = MOCK_AD_DURATION_MS): AdProvider {
  return {
    kind: "mock",
    prepareInterstitial() {},
    awaitInterstitialReady: () => Promise.resolve(true),
    showInterstitial: () => new Promise<void>((resolve) => setTimeout(resolve, durationMs)),
    showRewarded: () => new Promise<boolean>((resolve) => setTimeout(() => resolve(true), durationMs)),
  };
}

/** 앱 전체에서 쓰는 광고 제공자. T13 에서 네이티브 플랫폼이면 AdMob 구현으로 바꾼다. */
export const adProvider: AdProvider = createMockAdProvider();
