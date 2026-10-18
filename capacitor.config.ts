import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "kr.co.prore.malsseumsup",
  appName: "성경-말씀숲",
  webDir: "out",
  plugins: {
    // 스플래시는 웹 화면(SplashView)이 대신하므로 네이티브 스플래시는 바로 숨긴다 (AppProvider 에서 hide)
    SplashScreen: { launchShowDuration: 0 },
    CapacitorSQLite: { androidIsEncryption: false },
  },
};

export default config;
