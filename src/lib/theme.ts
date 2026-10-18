// 화면 테마 (docs/spec.md 5장 15). 시스템 설정 · 밝게 · 어둡게.
// 설정(SQLite)은 비동기로 읽혀서, 그대로 두면 앱을 켤 때 밝은 화면이 번쩍인다. 그래서 고른 테마를 localStorage 에도 복사해 두고,
// <head> 의 인라인 스크립트가 첫 화면을 그리기 전에 적용한다 (Next.js 문서 "Preventing flash before hydration").
import type { Settings } from "@/app/types";

export type Theme = Settings["theme"];

export const THEMES: readonly Theme[] = ["system", "light", "dark"];
export const THEME_LABELS: Record<Theme, string> = { system: "시스템 설정", light: "밝게", dark: "어둡게" };
export const THEME_STORAGE_KEY = "malsseumsup.theme";

export function isTheme(value: unknown): value is Theme {
  return value === "system" || value === "light" || value === "dark";
}

/** <html data-theme> 에 넣을 값. 시스템 설정이면 null — 속성을 지워서 기기의 밝기 설정을 따른다. */
export function dataThemeFor(theme: Theme): "light" | "dark" | null {
  return theme === "system" ? null : theme;
}

/** 첫 화면이 그려지기 전에 실행되는 코드. 저장된 테마가 light/dark 일 때만 속성을 붙인다. 저장소를 못 쓰는 환경에서도 오류 없이 지나간다. */
export function themeInitScript(): string {
  const key = JSON.stringify(THEME_STORAGE_KEY);
  return `(function(){try{var t=localStorage.getItem(${key});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
}

type RootLike = Pick<HTMLElement, "setAttribute" | "removeAttribute">;
type StorageLike = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): StorageLike | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined; // 사이트 데이터가 막힌 환경
  }
}

/** 마지막으로 저장해 둔 테마 (없거나 이상한 값이면 undefined) */
export function readStoredTheme(storage: StorageLike | undefined = browserStorage()): Theme | undefined {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/** 테마를 화면에 적용하고 다음 실행의 첫 화면을 위해 기억해 둔다 */
export function applyTheme(
  theme: Theme,
  root: RootLike = document.documentElement,
  storage: StorageLike | undefined = browserStorage(),
): void {
  const value = dataThemeFor(theme);
  if (value) root.setAttribute("data-theme", value);
  else root.removeAttribute("data-theme");
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // 저장하지 못해도 이번 실행에는 적용된다
  }
}
