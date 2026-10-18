"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppStore } from "@/app/store";
import SplashView from "@/components/SplashView";

const SPLASH_MS = 1500;

// 01 스플래시: 1.5초 뒤 첫 실행을 마쳤으면 홈, 아니면 온보딩 (docs/spec.md 5장)
export default function SplashPage() {
  const router = useRouter();
  const onboarded = useAppStore((s) => s.settings?.onboarded);

  useEffect(() => {
    if (onboarded === undefined) return;
    const timer = setTimeout(() => router.replace(onboarded ? "/home/" : "/onboarding/"), SPLASH_MS);
    return () => clearTimeout(timer);
  }, [onboarded, router]);

  return <SplashView />;
}
