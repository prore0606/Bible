"use client";

// 한 장을 읽는 화면(1장 읽기 /read, 자유 읽기 /bible)이 같이 쓰는 로직: 언어·글자 크기 설정, 구절 저장,
// "끝까지 읽었는지" 감지. 화면마다 다른 것(헤더, 미션 단계, 아래 버튼)은 각 화면이 맡는다.
import { useEffect, useMemo, useRef, useState } from "react";
import { appStore, useAppStore } from "@/app/store";
import { showToast } from "@/app/toast";
import type { Ref } from "@/app/types";
import { pairVerses } from "@/lib/bible";
import { FONT_PX, nextFontSize, saveToastText, toggleLang, visibleRows, type Langs } from "@/lib/reading";

const DEFAULT_LANGS: Langs = { ko: true, en: false };

export function useChapterReader(at: Ref, ko: string[], en: string[]) {
  const storedLangs = useAppStore((s) => s.settings?.langs);
  const langs = storedLangs ?? DEFAULT_LANGS;
  const fontSize = useAppStore((s) => s.settings?.fontSize) ?? "m";
  const savedVerses = useAppStore((s) => s.savedVerses);

  const fontPx = FONT_PX[fontSize];
  const rows = useMemo(() => visibleRows(pairVerses(ko, en), langs), [ko, en, langs]);
  const saved = useMemo(
    () =>
      new Set(savedVerses.filter((v) => v.ref.book === at.book && v.ref.chapter === at.chapter).map((v) => v.verse)),
    [savedVerses, at.book, at.chapter],
  );

  // 끝까지 읽었는지: 본문 맨 아래 표식이 스크롤 영역 안에 들어오면 true (한 번 true 가 되면 유지)
  const scrollRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let highest = -1;
        let end = false;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          if (el.dataset.end !== undefined) end = true;
          else highest = Math.max(highest, Number(el.dataset.index));
        }
        if (highest >= 0) setSeen((prev) => Math.max(prev, highest + 1));
        if (end) setReachedEnd(true);
      },
      { root, threshold: 0 },
    );
    root.querySelectorAll("[data-index], [data-end]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [rows.length, fontPx, langs.ko, langs.en]);

  const toggleVerse = async (verse: number) => {
    const text = ko[verse - 1] ?? en[verse - 1] ?? "";
    try {
      const nowSaved = await appStore.getState().toggleVerse({ ref: at, verse, text });
      showToast(saveToastText(at, verse, nowSaved));
    } catch {
      showToast("저장하지 못했어요. 다시 시도해 주세요");
    }
  };

  const changeLang = (lang: keyof Langs) => {
    const next = toggleLang(langs, lang);
    if (next === langs) {
      showToast("한 가지 언어는 켜져 있어야 해요");
      return;
    }
    void appStore.getState().updateSettings({ langs: next });
  };

  const cycleFont = () => void appStore.getState().updateSettings({ fontSize: nextFontSize(fontSize) });

  // scrollRef 는 따로 돌려준다: ref 가 들어 있는 객체의 다른 값을 렌더 중에 읽으면 React 린트가 막는다
  return [scrollRef, {
    langs,
    fontSize,
    fontPx,
    rows,
    saved,
    /** 지금까지 화면에 들어온 절 수 (끝까지 읽었으면 전체) */
    shown: reachedEnd ? rows.length : Math.min(seen, rows.length),
    reachedEnd,
    toggleVerse,
    changeLang,
    cycleFont,
  }] as const;
}
