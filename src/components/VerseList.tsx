"use client";

// 성경 본문 목록 (docs/spec.md 5장 09). 1장 읽기(/read)와 자유 읽기(/bible)가 같이 쓴다.
// 절을 누르면 저장/취소를 부모에게 알린다. 한국어는 나눔명조, 영어는 Pretendard.
import { isMergedVerseNote } from "@/lib/bible";
import type { VerseRow } from "@/lib/reading";

type Props = {
  rows: readonly VerseRow[];
  /** 저장된 절 번호들 */
  saved: ReadonlySet<number>;
  /** 한국어 본문 글자 크기(px) */
  fontPx: number;
  onToggle: (verse: number) => void;
};

export default function VerseList({ rows, saved, fontPx, onToggle }: Props) {
  return (
    <ol className="mt-2">
      {rows.map((row, index) => {
        const both = row.ko !== undefined && row.en !== undefined;
        const note = row.ko !== undefined && isMergedVerseNote(row.ko);
        const isSaved = saved.has(row.verse);
        const content = (
          <>
            <span className="min-w-[16px] pt-[5px] text-[12px] font-extrabold text-green-text">{row.verse}</span>
            <span className="block flex-1 pr-5">
              {row.ko !== undefined && (
                <span
                  className={`block font-bible leading-[1.75] ${note ? "text-gray-text italic" : "text-ink"}`}
                  style={{ fontSize: fontPx }}
                >
                  {row.ko}
                </span>
              )}
              {row.en !== undefined && (
                <span
                  className={`block font-sans leading-[1.6] ${both ? "mt-0.5 text-gray-text" : "text-ink"}`}
                  style={{ fontSize: both ? fontPx * 0.85 : fontPx }}
                >
                  {row.en}
                </span>
              )}
            </span>
          </>
        );

        const rowClass = `relative flex w-full gap-2 px-2 py-1.5 text-left ${
          both ? "border-b border-line" : "rounded-[10px]"
        } ${isSaved ? "bg-highlight" : ""}`;

        return (
          <li key={row.verse} data-index={index}>
            {note ? (
              <div className={rowClass}>{content}</div>
            ) : (
              <button
                type="button"
                aria-pressed={isSaved}
                aria-label={`${row.verse}절${isSaved ? " (저장됨)" : ""}`}
                onClick={() => onToggle(row.verse)}
                className={rowClass}
              >
                {content}
                {isSaved && (
                  <span
                    aria-hidden="true"
                    className="absolute top-2 right-1.5 h-[16px] w-[12px] bg-brand [clip-path:polygon(0_0,100%_0,100%_100%,50%_72%,0_100%)]"
                  />
                )}
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
