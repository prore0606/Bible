import { describe, expect, it } from "vitest";
import {
  THEMES,
  THEME_LABELS,
  THEME_STORAGE_KEY,
  applyTheme,
  dataThemeFor,
  isTheme,
  readStoredTheme,
  themeInitScript,
} from "@/lib/theme";

function fakeRoot() {
  const attrs = new Map<string, string>();
  return {
    attrs,
    setAttribute: (k: string, v: string) => void attrs.set(k, v),
    removeAttribute: (k: string) => void attrs.delete(k),
  };
}
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe("테마 값", () => {
  it("시스템 · 밝게 · 어둡게", () => {
    expect([...THEMES]).toEqual(["system", "light", "dark"]);
    expect(THEME_LABELS).toEqual({ system: "시스템 설정", light: "밝게", dark: "어둡게" });
  });

  it("isTheme", () => {
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("system")).toBe(true);
    expect(isTheme("blue")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });

  it("시스템 설정이면 속성을 붙이지 않는다 (기기 설정을 따른다)", () => {
    expect(dataThemeFor("system")).toBeNull();
    expect(dataThemeFor("light")).toBe("light");
    expect(dataThemeFor("dark")).toBe("dark");
  });
});

describe("applyTheme", () => {
  it("어둡게/밝게는 data-theme 을 붙이고 저장한다", () => {
    const root = fakeRoot();
    const storage = fakeStorage();
    applyTheme("dark", root, storage);
    expect(root.attrs.get("data-theme")).toBe("dark");
    expect(storage.data.get(THEME_STORAGE_KEY)).toBe("dark");
    applyTheme("light", root, storage);
    expect(root.attrs.get("data-theme")).toBe("light");
  });

  it("시스템 설정으로 돌아오면 속성을 지우고 저장한다", () => {
    const root = fakeRoot();
    const storage = fakeStorage();
    applyTheme("dark", root, storage);
    applyTheme("system", root, storage);
    expect(root.attrs.has("data-theme")).toBe(false);
    expect(storage.data.get(THEME_STORAGE_KEY)).toBe("system");
  });

  it("저장소가 없거나 쓰기가 막혀도 오류 없이 적용된다", () => {
    const root = fakeRoot();
    expect(() => applyTheme("dark", root, undefined)).not.toThrow();
    expect(root.attrs.get("data-theme")).toBe("dark");
    const broken = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    expect(() => applyTheme("light", root, broken)).not.toThrow();
    expect(root.attrs.get("data-theme")).toBe("light");
  });
});

describe("readStoredTheme", () => {
  it("저장된 테마를 읽고, 이상한 값·저장소 오류는 undefined", () => {
    expect(readStoredTheme(fakeStorage({ [THEME_STORAGE_KEY]: "dark" }))).toBe("dark");
    expect(readStoredTheme(fakeStorage({ [THEME_STORAGE_KEY]: "neon" }))).toBeUndefined();
    expect(readStoredTheme(fakeStorage())).toBeUndefined();
    expect(readStoredTheme(undefined)).toBeUndefined();
    expect(readStoredTheme({ getItem: () => { throw new Error("blocked"); }, setItem: () => {} })).toBeUndefined();
  });
});

describe("themeInitScript (첫 화면이 그려지기 전에 실행)", () => {
  const run = (stored: string | null | "throw") => {
    const root = fakeRoot();
    const storage =
      stored === "throw"
        ? { getItem: () => { throw new Error("blocked"); } }
        : { getItem: (k: string) => (k === THEME_STORAGE_KEY ? stored : null) };
    new Function("document", "localStorage", themeInitScript())({ documentElement: root }, storage);
    return root.attrs.get("data-theme");
  };

  it("저장된 어둡게/밝게를 적용한다", () => {
    expect(run("dark")).toBe("dark");
    expect(run("light")).toBe("light");
  });

  it("시스템 설정·없음·이상한 값이면 아무것도 붙이지 않는다", () => {
    expect(run("system")).toBeUndefined();
    expect(run(null)).toBeUndefined();
    expect(run("neon")).toBeUndefined();
  });

  it("저장소가 막혀 있어도 예외가 나지 않는다", () => {
    expect(() => run("throw")).not.toThrow();
    expect(run("throw")).toBeUndefined();
  });

  it("스크립트에 저장 키가 정확히 들어 있다", () => {
    expect(themeInitScript()).toContain(JSON.stringify(THEME_STORAGE_KEY));
  });
});
