"use client";

import { useEffect } from "react";
import { toastStore, useToastState } from "@/app/toast";

const VISIBLE_MS = 1600;

/** 앱 전체에서 하나만 둔다 (AppProvider). 아래쪽 버튼 영역 바로 위에 뜬다. */
export default function ToastHost() {
  const message = useToastState((s) => s.message);
  const visible = useToastState((s) => s.visible);
  const seq = useToastState((s) => s.seq);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => toastStore.getState().hide(), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [visible, seq]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      className={`pointer-events-none fixed bottom-[calc(150px+env(safe-area-inset-bottom))] left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/90 px-4 py-2 text-[14px] text-bg transition-all duration-200 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      {message}
    </div>
  );
}
