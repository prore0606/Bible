"use client";

import { useEffect } from "react";

type Props = {
  /** 스크린 리더가 읽는 이름 */
  label: string;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * 아래에서 올라오는 시트 (위쪽 모서리 24px). 뒤의 화면은 어둡게 덮인다.
 * 어두운 배경이나 ✕, Esc 키로 닫는다. 렌더링되어 있는 동안이 곧 "열려 있는" 상태다.
 */
export default function BottomSheet({ label, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button type="button" aria-label="닫기" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-scrim" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="animate-sheet-up relative w-full max-w-[480px] rounded-t-sheet bg-card px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto mb-4 h-1 w-8 rounded-full bg-line" aria-hidden="true" />
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="absolute top-4 right-5 flex h-8 w-8 items-center justify-center text-[18px] text-gray"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
