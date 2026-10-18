"use client";

import { useMemo } from "react";
import { sceneSvg } from "@/lib/vineSvg";

/**
 * 포도원 그림. day = 포도원 성장일, wilt = 어제를 놓쳐 잎이 살짝 처진 모습.
 * 그림 문자열은 우리 코드(lib/vineSvg.ts)가 숫자만으로 만들고 사용자 입력이 섞이지 않으므로 그대로 넣어도 안전하다.
 */
export default function VineScene({ day, wilt = false, label }: { day: number; wilt?: boolean; label: string }) {
  const markup = useMemo(() => sceneSvg(day, { wilt }), [day, wilt]);
  return (
    <svg
      viewBox="0 0 240 200"
      preserveAspectRatio="xMidYMax meet"
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
