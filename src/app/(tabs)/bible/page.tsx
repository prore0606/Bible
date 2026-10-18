"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { Ref } from "@/app/types";
import BookPicker from "@/components/BookPicker";
import { FontSizeButton, LangToggle } from "@/components/ReaderControls";
import { useChapterReader } from "@/components/useChapterReader";
import VerseList from "@/components/VerseList";
import { Button, Heading, Screen } from "@/components/ui";
import { getBook } from "@/data/books";
import { getChapter } from "@/lib/bible";
import { prevRef, nextRef } from "@/lib/mission";
import { DEFAULT_START, bibleHref, formatRef, parseRefParams } from "@/lib/ref";

/** 이번 실행 동안 마지막으로 본 장 — 성경 탭으로 돌아오면 거기서 다시 고른다 */
let lastViewed: Ref | undefined;

// 16 자유 읽기 (docs/spec.md 5장): 책·장을 골라 본문을 읽는다. 미션 진도와 무관하고 구절 저장은 된다.
export default function BiblePage() {
  // useSearchParams 는 정적 export 에서 Suspense 안에 있어야 한다
  return (
    <Suspense fallback={null}>
      <BibleView />
    </Suspense>
  );
}

function BibleView() {
  const params = useSearchParams();
  const at = parseRefParams(params.get("book"), params.get("chapter"));
  // 주소가 없거나 잘못됐으면(없는 책·장) 책·장 고르기로
  return at ? <ChapterLoader key={`${at.book}.${at.chapter}`} book={at.book} chapter={at.chapter} /> : <BiblePicker />;
}

function BiblePicker() {
  const router = useRouter();
  const [ref, setRef] = useState<Ref>(lastViewed ?? DEFAULT_START);

  return (
    <Screen withTabBar>
      <Heading size="md">성경</Heading>
      <div className="mt-4">
        <BookPicker value={ref} onChange={setRef} />
      </div>
      <div className="mt-5 flex items-center justify-between rounded-[12px] bg-butter px-4 py-3 text-[14px] text-butter-text" aria-live="polite">
        <span>읽을 곳</span>
        <b className="text-[17px] text-ink">{formatRef(ref)}</b>
      </div>
      <div className="mt-3">
        <Button onClick={() => router.push(bibleHref(ref))}>읽기</Button>
      </div>
    </Screen>
  );
}

type Loaded = { ko: string[]; en: string[] };
type State = { status: "loading" } | { status: "error"; message: string } | ({ status: "ready" } & Loaded);

function ChapterLoader({ book, chapter }: { book: Ref["book"]; chapter: number }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const at = { book, chapter };
    lastViewed = at;
    let cancelled = false;
    Promise.all([getChapter("ko", at), getChapter("en", at)])
      .then(([ko, en]) => {
        if (!cancelled) setState({ status: "ready", ko, en });
      })
      .catch((e) => {
        if (!cancelled) setState({ status: "error", message: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [book, chapter, attempt]);

  if (state.status === "ready") return <ChapterView at={{ book, chapter }} ko={state.ko} en={state.en} />;

  return (
    <Screen withTabBar className="items-center justify-center text-center">
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
    </Screen>
  );
}

function ChapterView({ at, ko, en }: { at: Ref; ko: string[]; en: string[] }) {
  const router = useRouter();
  const [scrollRef, reader] = useChapterReader(at, ko, en);
  const prev = prevRef(at);
  const next = nextRef(at);

  return (
    <main className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center justify-between px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={() => router.replace("/bible/")}
          aria-label="책·장 고르기로 돌아가기"
          className="flex items-center gap-1.5 text-[18px] font-bold"
        >
          <span aria-hidden="true">‹</span>
          {getBook(at.book).ko}
        </button>
        <FontSizeButton fontSize={reader.fontSize} onCycle={reader.cycleFont} />
      </header>

      <div className="shrink-0">
        <LangToggle langs={reader.langs} onChange={reader.changeLang} />
      </div>

      <div className="relative mt-1 min-h-0 flex-1">
        <div ref={scrollRef} className="scroll-hidden h-full overflow-y-auto px-4 pb-10">
          <h1 className="pt-3 text-[24px] font-extrabold tracking-[-0.5px]">{at.chapter}장</h1>
          <VerseList rows={reader.rows} saved={reader.saved} fontPx={reader.fontPx} onToggle={reader.toggleVerse} />
          <div data-end="true" className="h-px" aria-hidden="true" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-bg to-transparent" />
      </div>

      <nav
        aria-label="장 이동"
        className="flex shrink-0 gap-2 px-4 pt-2 pb-[calc(70px+env(safe-area-inset-bottom))]"
      >
        <button
          type="button"
          aria-label={`이전 장: ${formatRef(prev)}`}
          onClick={() => router.replace(bibleHref(prev))}
          className="h-11 flex-1 rounded-button bg-card text-[15px] font-semibold shadow-card active:opacity-80"
        >
          ‹ 이전 장
        </button>
        <button
          type="button"
          aria-label={`다음 장: ${formatRef(next)}`}
          onClick={() => router.replace(bibleHref(next))}
          className="h-11 flex-1 rounded-button bg-card text-[15px] font-semibold shadow-card active:opacity-80"
        >
          다음 장 ›
        </button>
      </nav>
    </main>
  );
}
