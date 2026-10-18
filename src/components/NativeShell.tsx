"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { appStore, useAppStore } from "@/app/store";
import { showToast } from "@/app/toast";
import { EXIT_HINT, backAction, shouldExit } from "@/lib/backButton";

/**
 * 안드로이드 앱(Capacitor)에서만 하는 일: 네이티브 스플래시 숨기기, 상태바 색, 뒤로가기, 앱이 다시 열릴 때 날짜 새로 읽기.
 * 브라우저에서는 아무것도 하지 않는다. 플러그인은 앱에서만 불러온다(웹 번들에 넣지 않기 위해 동적 import).
 */
export default function NativeShell() {
  const router = useRouter();
  const theme = useAppStore((s) => s.settings?.theme);
  const ready = useAppStore((s) => s.status === "ready");

  useEffect(() => {
    let cancelled = false;
    let remove: (() => void) | undefined;
    void (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform() || cancelled) return;
      const { App } = await import("@capacitor/app");
      let lastPressAt: number | undefined;

      const back = await App.addListener("backButton", () => {
        const action = backAction(window.location.pathname, window.location.search);
        if (action === "ignore") return;
        if (action === "home") {
          appStore.getState().leaveFlow();
          router.replace("/home/");
        } else if (action === "history") {
          window.history.back();
        } else if (shouldExit(lastPressAt, Date.now())) {
          void App.exitApp();
        } else {
          lastPressAt = Date.now();
          showToast(EXIT_HINT);
        }
      });
      const resume = await App.addListener("resume", () => void appStore.getState().refresh());
      remove = () => {
        void back.remove();
        void resume.remove();
      };
      if (cancelled) remove();
    })();
    return () => {
      cancelled = true;
      remove?.();
    };
  }, [router]);

  // 저장소가 열려 화면이 보이기 시작하면 네이티브 스플래시를 걷는다 (그 뒤는 SplashView 모양이 이어진다)
  useEffect(() => {
    if (!ready) return;
    void (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;
      const { SplashScreen } = await import("@capacitor/splash-screen");
      await SplashScreen.hide();
    })();
  }, [ready]);

  // 상태바: 어두운 화면이면 밝은 글자, 밝은 화면이면 어두운 글자
  useEffect(() => {
    void (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      const dark = theme === "dark" || (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    })();
  }, [theme]);

  return null;
}
