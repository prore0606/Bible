"use client";

import { useLayoutEffect } from "react";
import { useAppStore } from "@/app/store";
import { applyTheme, readStoredTheme } from "@/lib/theme";

/**
 * 설정의 화면 테마를 <html data-theme> 에 적용한다. 앱 시작 직후(설정을 읽기 전)에도 항상 렌더링된다.
 * 첫 화면이 그려지기 전의 적용은 <head> 의 인라인 스크립트(themeInitScript)가 맡고, 여기서는
 * ① 개발 모드의 Strict Mode 가 <html> 속성을 지우는 경우를 위해 저장된 값을 다시 적용하고
 * ② 설정이 바뀌면 그 값을 적용하고 기억한다.
 */
export default function ThemeApplier() {
  const theme = useAppStore((s) => s.settings?.theme);

  useLayoutEffect(() => {
    const stored = readStoredTheme();
    if (stored) applyTheme(stored);
  }, []);

  useLayoutEffect(() => {
    if (theme) applyTheme(theme);
  }, [theme]);

  return null;
}
