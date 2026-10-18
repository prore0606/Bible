import { describe, expect, it } from "vitest";
import { TEST_AD_IDS, resolveAdConfig } from "@/lib/adIds";

const REAL = {
  NEXT_PUBLIC_ADMOB_MODE: "production",
  NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID: "ca-app-pub-1234567890123456/1111111111",
  NEXT_PUBLIC_ADMOB_REWARDED_ID: "ca-app-pub-1234567890123456/2222222222",
  NEXT_PUBLIC_ADMOB_BANNER_ID: "ca-app-pub-1234567890123456/3333333333",
};

describe("resolveAdConfig", () => {
  it("설정이 없으면 테스트 ID", () => {
    expect(resolveAdConfig({})).toEqual({ ids: TEST_AD_IDS, testing: true });
  });

  it("출시 모드 + 올바른 ID 세 개일 때만 실제 ID", () => {
    expect(resolveAdConfig(REAL)).toEqual({
      ids: { interstitial: "ca-app-pub-1234567890123456/1111111111", rewarded: "ca-app-pub-1234567890123456/2222222222", banner: "ca-app-pub-1234567890123456/3333333333" },
      testing: false,
    });
  });

  it("출시 모드가 아니면 ID 가 있어도 테스트 ID (개발 빌드에 실제 ID 가 새지 않는다)", () => {
    expect(resolveAdConfig({ ...REAL, NEXT_PUBLIC_ADMOB_MODE: "development" }).testing).toBe(true);
    expect(resolveAdConfig({ ...REAL, NEXT_PUBLIC_ADMOB_MODE: undefined }).testing).toBe(true);
  });

  it("ID 가 하나라도 빠졌거나 형식이 틀리면 테스트 ID", () => {
    expect(resolveAdConfig({ ...REAL, NEXT_PUBLIC_ADMOB_BANNER_ID: undefined }).testing).toBe(true);
    expect(resolveAdConfig({ ...REAL, NEXT_PUBLIC_ADMOB_REWARDED_ID: "ca-app-pub-xxx" }).testing).toBe(true);
    expect(resolveAdConfig({ ...REAL, NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID: "ca-app-pub-1234567890123456~1111111111" }).testing).toBe(true);
  });

  it("출시 모드에 테스트 ID 를 넣어도 실제 ID 로 인정하지 않는다", () => {
    const withTest = { ...REAL, NEXT_PUBLIC_ADMOB_BANNER_ID: TEST_AD_IDS.banner };
    expect(resolveAdConfig(withTest)).toEqual({ ids: TEST_AD_IDS, testing: true });
  });
});
