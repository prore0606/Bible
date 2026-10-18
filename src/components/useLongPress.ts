"use client";

import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { LONG_PRESS_MS, movedTooFar } from "@/lib/records";

/**
 * 길게 누르기 (저장한 구절 카드 삭제). 누른 채 시간이 지나면 onLongPress 를 부르고,
 * 손가락이 많이 움직이면(스크롤) 취소한다. 안드로이드에서 길게 누를 때 뜨는 시스템 메뉴는 막는다.
 */
export function useLongPress(onLongPress: () => void, ms: number = LONG_PRESS_MS) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const origin = useRef<{ x: number; y: number } | undefined>(undefined);

  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    origin.current = undefined;
  }, []);

  useEffect(() => cancel, [cancel]);

  return {
    onPointerDown: (e: ReactPointerEvent) => {
      cancel();
      origin.current = { x: e.clientX, y: e.clientY };
      timer.current = setTimeout(() => {
        origin.current = undefined;
        onLongPress();
      }, ms);
    },
    onPointerMove: (e: ReactPointerEvent) => {
      if (origin.current && movedTooFar(e.clientX - origin.current.x, e.clientY - origin.current.y)) cancel();
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}
