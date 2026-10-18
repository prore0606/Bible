"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { appStore } from "@/app/store";
import { showToast } from "@/app/toast";
import type { Ref } from "@/app/types";
import { FontSizeButton, LangToggle } from "@/components/ReaderControls";
import { useChapterReader } from "@/components/useChapterReader";
import VerseList from "@/components/VerseList";
import { Button } from "@/components/ui";
import { getBook } from "@/data/books";
import { getChapter } from "@/lib/bible";
import { readFraction } from "@/lib/reading";

/** `at` = 오늘 읽을 장의 위치 (React 의 `ref` 와 헷갈리지 않게 다른 이름을 쓴다) */
type Loaded = { at: Ref; ko: string[]; en: string[] };
type State = { status: "loading" } | { status: "error"; message: string } | ({ status: "ready" } & Loaded);

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
        <p className="text-[15px] text-gray-text">말씀을 불러오는 중이에요…</p>
      ) : (
        <>
          <p className="text-[17px] font-bold">말씀을 불러오지 못했어요</p>
          <p className="mt-1 max-w-full break-words text-[13px] text-gray-text">{state.message}</p>
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
  const book = getBook(at.book);
  const [scrollRef, reader] = useChapterReader(at, ko, en);
  const [finishing, setFinishing] = useState(false);

  const goHome = () => {
    appStore.getState().leaveFlow();
    router.replace("/home/");
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
        <FontSizeButton fontSize={reader.fontSize} onCycle={reader.cycleFont} />
      </header>

      <div className="flex shrink-0 gap-1 px-4" role="img" aria-label="2단계 중 1단계">
        <span className="h-1 flex-1 rounded-full bg-blue" />
        <span className="h-1 flex-1 rounded-full bg-line" />
      </div>
      <p className="shrink-0 px-4 pt-1.5 text-[13px] font-bold text-blue-text">
        미션 1/2 · 1장 읽기 <span className="font-medium text-gray-text">· 구절을 누르면 저장</span>
      </p>

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

      <div className="shrink-0 px-4 pt-2 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <div className="mb-1.5 flex justify-between text-[12px] text-gray-text">
          <span>{reader.reachedEnd ? "끝까지 읽었어요" : "끝까지 읽으면 버튼이 켜져요"}</span>
          <span>
            {reader.shown} / {reader.rows.length}절
          </span>
        </div>
        <div className="mb-3 h-[5px] overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div
            className="h-full rounded-full bg-blue transition-[width]"
            style={{ width: `${readFraction(reader.shown, reader.rows.length) * 100}%` }}
          />
        </div>
        <Button onClick={finish} disabled={!reader.reachedEnd || finishing}>
          다 읽었어요
        </Button>
      </div>
    </main>
  );
}
