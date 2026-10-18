"use client";

import { useEffect, useState } from "react";
import type { Ref } from "@/app/types";
import { getChapter } from "@/lib/bible";

/** 한국어 본문 한 절을 불러온다 (홈의 초록 배너 등). 불러오는 동안·실패하면 undefined. */
export function useVerseText(ref: Ref | undefined, verse: number): string | undefined {
  const book = ref?.book;
  const chapter = ref?.chapter;
  const key = book && chapter ? `${book}.${chapter}.${verse}` : undefined;
  // 어느 구절의 글인지 함께 들고 있어서, 구절이 바뀐 직후에 이전 글이 잠깐 보이는 일이 없다
  const [loaded, setLoaded] = useState<{ key: string; text?: string }>();

  useEffect(() => {
    if (!book || !chapter || !key) return;
    let cancelled = false;
    getChapter("ko", { book, chapter })
      .then((verses) => {
        if (!cancelled) setLoaded({ key, text: verses[verse - 1] });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key });
      });
    return () => {
      cancelled = true;
    };
  }, [book, chapter, verse, key]);

  return loaded && loaded.key === key ? loaded.text : undefined;
}
