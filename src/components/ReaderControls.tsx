"use client";

import { FONT_LABELS, type FontSize, type Langs } from "@/lib/reading";

/** 글자 크기 버튼: 누를 때마다 작게 → 보통 → 크게 → 작게 */
export function FontSizeButton({ fontSize, onCycle }: { fontSize: FontSize; onCycle: () => void }) {
  return (
    <button
      type="button"
      aria-label={`글자 크기 바꾸기 (지금: ${FONT_LABELS[fontSize]})`}
      onClick={onCycle}
      className="flex items-baseline gap-0.5 rounded-full bg-line px-3.5 py-1.5 font-bold text-gray active:opacity-80"
    >
      <span className="text-[12px]">가</span>
      <span className="text-[17px]">가</span>
    </button>
  );
}

/** 본문 언어 토글: 한국어·English 복수 선택 (최소 1개는 부모가 보장) */
export function LangToggle({ langs, onChange }: { langs: Langs; onChange: (lang: keyof Langs) => void }) {
  return (
    <div className="px-4 pt-2.5">
      <div className="mb-1.5 text-[12px] text-gray">본문 언어 · 복수 선택 가능</div>
      <div className="flex gap-1.5">
        {(["ko", "en"] as const).map((lang) => (
          <button
            key={lang}
            type="button"
            aria-pressed={langs[lang]}
            onClick={() => onChange(lang)}
            className={`h-9 flex-1 rounded-full border-[1.5px] text-[14px] font-semibold ${
              langs[lang] ? "border-blue bg-blue text-on-blue" : "border-line bg-card text-gray"
            }`}
          >
            {langs[lang] && "✓ "}
            {lang === "ko" ? "한국어" : "English"}
          </button>
        ))}
      </div>
    </div>
  );
}
