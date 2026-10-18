"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { appStore, useAppStore } from "@/app/store";
import { showToast } from "@/app/toast";
import type { Ref } from "@/app/types";
import VerseList from "@/components/VerseList";
import { Button } from "@/components/ui";
import { getBook } from "@/data/books";
import { getChapter, pairVerses } from "@/lib/bible";
import {
  FONT_LABELS,
  FONT_PX,
  nextFontSize,
  readFraction,
  saveToastText,
  toggleLang,
  visibleRows,
} from "@/lib/reading";

/** `at` = 오늘 읽을 장의 위치 (React 의 `ref` 와 헷갈리지 않게 다른 이름을 쓴다) */
type Loaded = { at: Ref; ko: string[]; en: string[] };
type State = { status: "loading" } | { status: "error"; message: string } | ({ status: "ready" } & Loaded);

const DEFAULT_LANGS = { ko: true, en: false };

// 09 1장 읽기 (docs/spec.md 5장): 오늘 미션의 장을 읽고, 끝까지 읽으면 "다 읽었어요"가 켜진다
export default function ReadPage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const log = await appStore.getState().beginReading();
      if (log.completedAt) {
        router.replace("/home/"); // 오늘 미션은 이미 끝냈다 (하루에 한 번)
        return;
      }
      const [ko, en] = await Promise.all([getChapter("ko", log.ref), getChapter("en", log.ref)]);
      if (!cancelled) setState({ status: "ready", at: log.ref, ko, en });
    })().catch((e) => {
      if (!cancelled) setState({ status: "error", message: e instanceof Error ? e.message : String(e) });
    });
    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  if (state.status === "ready") {
    return <ReadView key={`${state.at.book}.${state.at.chapter}`} at={state.at} ko={state.ko} en={state.en} />;
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      {state.status === "loading" ? (
        <p className="text-[15px] text-gray">말씀을 불러오는 중이에요…</p>
      ) : (
        <>
          <p className="text-[17px] font-bold">말씀을 불러오지 못했어요</p>
          <p className="mt-1 max-w-full break-words text-[13px] text-gray">{state.message}</p>
          <div className="mt-5 w-40">
            <Button
              onClick={() => {
                setState({ status: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              다시 시도
            </Button>
          </div>
        </>
      )}
    </main>
  );
}

function ReadView({ at, ko, en }: Loaded) {
  const router = useRouter();
  const storedLangs = useAppStore((s) => s.settings?.langs);
  const langs = storedLangs ?? DEFAULT_LANGS;
  const fontSize = useAppStore((s) => s.settings?.fontSize) ?? "m";
  const savedVerses = useAppStore((s) => s.savedVerses);

  const book = getBook(at.book);
  const fontPx = FONT_PX[fontSize];
  const rows = useMemo(() => visibleRows(pairVerses(ko, en), langs), [ko, en, langs]);
  const saved = useMemo(
    () =>
      new Set(savedVerses.filter((v) => v.ref.book === at.book && v.ref.chapter === at.chapter).map((v) => v.verse)),
    [savedVerses, at.book, at.chapter],
  );

  // ── 끝까지 읽었는지: 본문 맨 아래 표식이 화면 안에 들어오면 "다 읽었어요"가 켜진다 ──────
  const scrollRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [finishing, setFinishing] = useState(false);

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

  const shown = reachedEnd ? rows.length : Math.min(seen, rows.length);

  // ── 동작 ────────────────────────────────────────────────────────────────
  const goHome = () => {
    appStore.getState().leaveFlow();
    router.replace("/home/");
  };

  const toggleVerse = async (verse: number) => {
    const text = ko[verse - 1] ?? en[verse - 1] ?? "";
    try {
      const nowSaved = await appStore.getState().toggleVerse({ ref: at, verse, text });
      showToast(saveToastText(at, verse, nowSaved));
    } catch {
      showToast("저장하지 못했어요. 다시 시도해 주세요");
    }
  };

  const changeLang = (lang: "ko" | "en") => {
    const next = toggleLang(langs, lang);
    if (next === langs) {
      showToast("한 가지 언어는 켜져 있어야 해요");
      return;
    }
    void appStore.getState().updateSettings({ langs: next });
  };

  const finish = async () => {
    setFinishing(true);
    try {
      await appStore.getState().finishReading();
      router.push("/pray/");
    } catch {
      showToast("저장하지 못했어요. 다시 시도해 주세요");
      setFinishing(false);
    }
  };

  return (
    <main className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center justify-between px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-2">
        <button type="button" onClick={goHome} className="flex items-center gap-1.5 text-[18px] font-bold">
          <span aria-hidden="true">‹</span>
          {book.ko}
        </button>
        <button
          type="button"
          aria-label={`글자 크기 바꾸기 (지금: ${FONT_LABELS[fontSize]})`}
          onClick={() => void appStore.getState().updateSettings({ fontSize: nextFontSize(fontSize) })}
          className="flex items-baseline gap-0.5 rounded-full bg-line px-3.5 py-1.5 font-bold text-gray active:opacity-80"
        >
          <span className="text-[12px]">가</span>
          <span className="text-[17px]">가</span>
        </button>
      </header>

      <div className="flex shrink-0 gap-1 px-4" role="img" aria-label="2단계 중 1단계">
        <span className="h-1 flex-1 rounded-full bg-blue" />
        <span className="h-1 flex-1 rounded-full bg-line" />
      </div>
      <p className="shrink-0 px-4 pt-1.5 text-[13px] font-bold text-blue">
        미션 1/2 · 1장 읽기 <span className="font-medium text-gray">· 구절을 누르면 저장</span>
      </p>

      <div className="shrink-0 px-4 pt-2.5">
        <div className="mb-1.5 text-[12px] text-gray">본문 언어 · 복수 선택 가능</div>
        <div className="flex gap-1.5">
          {(["ko", "en"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              aria-pressed={langs[lang]}
              onClick={() => changeLang(lang)}
              className={`h-9 flex-1 rounded-full border-[1.5px] text-[14px] font-semibold ${
                langs[lang] ? "border-blue bg-blue text-white" : "border-line bg-card text-gray"
              }`}
            >
              {langs[lang] && "✓ "}
              {lang === "ko" ? "한국어" : "English"}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-1 min-h-0 flex-1">
        <div ref={scrollRef} className="scroll-hidden h-full overflow-y-auto px-4 pb-10">
          <h1 className="pt-3 text-[24px] font-extrabold tracking-[-0.5px]">{at.chapter}장</h1>
          <VerseList rows={rows} saved={saved} fontPx={fontPx} onToggle={toggleVerse} />
          <div data-end="true" className="h-px" aria-hidden="true" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-bg to-transparent" />
      </div>

      <div className="shrink-0 px-4 pt-2 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <div className="mb-1.5 flex justify-between text-[12px] text-gray">
          <span>{reachedEnd ? "끝까지 읽었어요" : "끝까지 읽으면 버튼이 켜져요"}</span>
          <span>
            {shown} / {rows.length}절
          </span>
        </div>
        <div className="mb-3 h-[5px] overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div
            className="h-full rounded-full bg-blue transition-[width]"
            style={{ width: `${readFraction(shown, rows.length) * 100}%` }}
          />
        </div>
        <Button onClick={finish} disabled={!reachedEnd || finishing}>
          다 읽었어요
        </Button>
      </div>
    </main>
  );
}
