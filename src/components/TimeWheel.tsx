"use client";

// 알림 시간 휠 (docs/spec.md 5장 06): 오전/오후 · 1~12시 · 00~55분(5분 단위).
// 첫 실행의 알림 시간과 설정의 "알림 시간"이 같이 쓴다. 값은 부모가 들고, 변환 규칙은 src/lib/time.ts.
import { useEffect, useRef } from "react";
import { WHEEL_MINUTES, type WheelTime } from "@/lib/time";

const ITEM = 48; // 한 칸 높이(px)
const HEIGHT = 192; // 휠 전체 높이 — 4칸
const PAD = (HEIGHT - ITEM) / 2; // 첫·끝 항목이 가운데 오도록 위아래를 비운다

const PERIODS = ["오전", "오후"];
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = WHEEL_MINUTES.map((m) => String(m).padStart(2, "0"));

type ColumnProps = {
  label: string;
  items: readonly string[];
  index: number;
  onChange: (index: number) => void;
  className?: string;
  small?: boolean;
};

function WheelColumn({ label, items, index, onChange, className = "", small = false }: ColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(false);

  // 값이 바뀌면(빠른 선택 등) 그 칸이 가운데 오도록 스크롤한다. 처음 그릴 때는 애니메이션 없이.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const behavior = mounted.current ? "smooth" : "auto";
    mounted.current = true;
    const top = index * ITEM;
    if (Math.abs(el.scrollTop - top) < 1) return;
    el.scrollTo({ top, behavior });
  }, [index]);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  // 스크롤이 멈추면(80ms 동안 이벤트가 없으면) 가운데 칸을 값으로 삼는다
  const onScroll = () => {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const next = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM)));
      if (next !== index) onChange(next);
    }, 80);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && index < items.length - 1) {
      e.preventDefault();
      onChange(index + 1);
    } else if (e.key === "ArrowUp" && index > 0) {
      e.preventDefault();
      onChange(index - 1);
    }
  };

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      className={`scroll-hidden relative snap-y snap-mandatory overflow-y-auto overscroll-contain ${className}`}
      style={{
        height: HEIGHT,
        maskImage: "linear-gradient(transparent, #000 30%, #000 70%, transparent)",
        WebkitMaskImage: "linear-gradient(transparent, #000 30%, #000 70%, transparent)",
      }}
    >
      <div style={{ height: PAD }} aria-hidden="true" />
      {items.map((text, i) => (
        <div
          key={text}
          role="option"
          aria-selected={i === index}
          onClick={() => onChange(i)}
          className={`flex cursor-pointer snap-center items-center justify-center font-bold ${
            small ? "text-[17px]" : "text-2xl"
          } ${i === index ? "text-ink" : "text-gray/50"}`}
          style={{ height: ITEM }}
        >
          {text}
        </div>
      ))}
      <div style={{ height: PAD }} aria-hidden="true" />
    </div>
  );
}

export default function TimeWheel({ value, onChange }: { value: WheelTime; onChange: (time: WheelTime) => void }) {
  return (
    <div
      className="relative flex items-center justify-center gap-1 overflow-hidden rounded-card bg-card shadow-card"
      style={{ height: HEIGHT }}
    >
      <div
        className="pointer-events-none absolute inset-x-3 rounded-[12px] bg-blue-tint"
        style={{ top: PAD, height: ITEM }}
        aria-hidden="true"
      />
      <WheelColumn
        label="오전 또는 오후"
        items={PERIODS}
        index={value.period}
        onChange={(i) => onChange({ ...value, period: i === 1 ? 1 : 0 })}
        className="w-[88px]"
        small
      />
      <WheelColumn
        label="시"
        items={HOURS}
        index={value.hour12 - 1}
        onChange={(i) => onChange({ ...value, hour12: i + 1 })}
        className="w-[76px]"
      />
      <div className="relative text-2xl font-extrabold text-ink" aria-hidden="true">
        :
      </div>
      <WheelColumn
        label="분"
        items={MINUTES}
        index={WHEEL_MINUTES.indexOf(value.minute)}
        onChange={(i) => onChange({ ...value, minute: WHEEL_MINUTES[i] })}
        className="w-[76px]"
      />
    </div>
  );
}
