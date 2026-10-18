"use client";

// 책·장 고르기 (docs/spec.md 5장 05). 첫 실행의 "시작할 장"과 설정의 "읽는 곳 바꾸기"가 같이 쓴다.
// 값(value)은 부모가 들고, 바뀔 때마다 onChange 로 알린다. 규칙은 src/lib/ref.ts.
import { useEffect, useRef, useState } from "react";
import type { Ref } from "@/app/types";
import { booksOf, getBook, type Testament } from "@/data/books";
import { TESTAMENT_LABELS, chapterNumbers, pickBook, pickChapter, pickTestament } from "@/lib/ref";

const TESTAMENTS: Testament[] = ["OT", "NT"];

export default function BookPicker({ value, onChange }: { value: Ref; onChange: (ref: Ref) => void }) {
  const [testament, setTestament] = useState<Testament>(getBook(value.book).testament);
  const book = getBook(value.book);
  const selectedBook = useRef<HTMLButtonElement>(null);
  const selectedChapter = useRef<HTMLButtonElement>(null);

  // 다른 책이 이미 골라진 채 열렸을 때(예: 설정) 그 책과 장이 보이는 위치로 맞춘다
  useEffect(() => {
    selectedBook.current?.scrollIntoView({ block: "nearest" });
  }, [testament, value.book]);
  useEffect(() => {
    selectedChapter.current?.scrollIntoView({ block: "nearest" });
  }, [value.book]);

  const changeTestament = (next: Testament) => {
    setTestament(next);
    if (getBook(value.book).testament !== next) onChange(pickTestament(next));
  };

  return (
    <div>
      <div className="flex rounded-[12px] bg-line p-1" role="tablist" aria-label="구약과 신약">
        {TESTAMENTS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={testament === t}
            onClick={() => changeTestament(t)}
            className={`h-9 flex-1 rounded-[9px] text-[14px] font-semibold ${
              testament === t ? "bg-card text-ink shadow-card" : "text-gray"
            }`}
          >
            {TESTAMENT_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="scroll-hidden mt-3 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto" role="group" aria-label="책">
        {booksOf(testament).map((b) => {
          const on = b.code === value.book;
          return (
            <button
              key={b.code}
              ref={on ? selectedBook : undefined}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(pickBook(b.code))}
              className={`rounded-full border-[1.5px] px-3 py-1.5 text-[14px] ${
                on ? "border-blue bg-blue font-bold text-white" : "border-line bg-card text-ink/80"
              }`}
            >
              {b.ko}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-[15px] font-bold text-ink/80">{book.ko}</span>
        <span className="text-[13px] text-gray">전체 {book.chapters}장</span>
      </div>

      <div className="scroll-hidden mt-2 grid max-h-52 grid-cols-6 gap-1.5 overflow-y-auto" role="group" aria-label="장">
        {chapterNumbers(value.book).map((c) => {
          const on = c === value.chapter;
          return (
            <button
              key={c}
              ref={on ? selectedChapter : undefined}
              type="button"
              aria-pressed={on}
              aria-label={`${c}장`}
              onClick={() => onChange(pickChapter(value, c))}
              className={`aspect-square rounded-[11px] text-[14px] font-semibold shadow-card ${
                on ? "bg-blue text-white" : "bg-card text-ink/80"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}
