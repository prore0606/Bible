"use client";

import { useEffect } from "react";
import { TOAST_ACTION_MS, TOAST_MS, toastStore, useToastState } from "@/app/toast";

/** 앱 전체에서 하나만 둔다 (AppProvider). 아래쪽 버튼 영역 바로 위에 뜬다. */
export default function ToastHost() {
  const message = useToastState((s) => s.message);
  const action = useToastState((s) => s.action);
  const visible = useToastState((s) => s.visible);
  const seq = useToastState((s) => s.seq);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => toastStore.getState().hide(), action ? TOAST_ACTION_MS : TOAST_MS);
    return () => clearTimeout(timer);
  }, [visible, seq, action]);

  return (
    <div
      role="status"
      aria-live="polite"
      // 숨겨진 동안에는 화면 읽기 프로그램과 키보드 포커스에서 모두 빠진다 (aria-hidden 은 포커스가 남아 있으면 경고가 난다)
      inert={!visible}
      className={`fixed bottom-[calc(150px+env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-ink/90 py-2 pr-2 pl-4 text-[14px] whitespace-nowrap text-bg transition-all duration-200 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      } ${action ? "" : "pointer-events-none pr-4"}`}
    >
      <span>{message}</span>
      {action && (
        <button
          type="button"
          onClick={() => {
            toastStore.getState().hide();
            action.run();
          }}
          className="rounded-full bg-bg/20 px-3 py-1 text-[13px] font-bold"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
