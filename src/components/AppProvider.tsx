"use client";

// 앱 시작 처리: 저장소(SQLite)를 열고 설정을 불러온 뒤에 화면을 보여 주고, 경로 보호(첫 실행 여부)를 적용한다.
// 준비되는 동안에는 스플래시와 같은 모양(SplashView)이 보인다.
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { appStore, useAppStore } from "@/app/store";
import NativeShell from "@/components/NativeShell";
import NotificationSync from "@/components/NotificationSync";
import SplashView from "@/components/SplashView";
import ThemeApplier from "@/components/ThemeApplier";
import ToastHost from "@/components/Toast";
import { Button, Screen } from "@/components/ui";
import { guardTarget } from "@/lib/routeGuard";

export default function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeApplier />
      <NativeShell />
      <NotificationSync />
      <AppGate>{children}</AppGate>
    </>
  );
}

function AppGate({ children }: { children: React.ReactNode }) {
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const onboarded = useAppStore((s) => s.settings?.onboarded);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    void appStore.getState().init();
  }, []);

  const target = status === "ready" ? guardTarget(pathname, onboarded === true) : null;
  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  if (status === "error") {
    return (
      <Screen className="items-center justify-center text-center">
        <h1 className="text-xl font-extrabold">앱을 시작하지 못했어요</h1>
        <p className="mt-2 text-[15px] text-gray-text">저장소를 여는 중 문제가 생겼어요.</p>
        {error && <p className="mt-2 max-w-full break-words text-[12px] text-gray-text">{error}</p>}
        <div className="mt-6 w-48">
          <Button
            onClick={() => {
              appStore.setState({ status: "idle", error: undefined });
              void appStore.getState().init();
            }}
          >
            다시 시도
          </Button>
        </div>
      </Screen>
    );
  }

  // 준비 중이거나, 곧 다른 화면으로 옮겨 갈 때는 내용을 깜빡이지 않게 스플래시 모양을 유지한다
  if (status !== "ready" || target) return <SplashView />;
  return (
    <>
      {children}
      <ToastHost />
    </>
  );
}
