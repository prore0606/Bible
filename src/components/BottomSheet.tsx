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
        className="animate-sheet-up relative max-h-[90dvh] w-full max-w-[480px] overflow-y-auto rounded-t-sheet bg-card px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))]"
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

/**
 * 시트 맨 아래에 붙는 버튼 영역. 시트 내용이 길어 스크롤되어도 버튼은 항상 화면 아래에 보인다
 * (시트 아래 여백만큼 음수 여백을 줘서, 스크롤 영역의 맨 아래에 딱 붙는다).
 */
export function SheetFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 -mb-[calc(20px+env(safe-area-inset-bottom))] bg-card pt-3 pb-[calc(20px+env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}
