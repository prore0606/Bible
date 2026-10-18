// 여러 화면이 같이 쓰는 기본 부품. 색·모서리는 디자인 토큰(globals.css)만 쓴다.
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" };

export function Button({ variant = "primary", className = "", type = "button", ...rest }: ButtonProps) {
  const base = "flex w-full items-center justify-center font-sans transition-opacity disabled:opacity-40";
  const styles =
    variant === "primary"
      ? "h-14 rounded-button bg-blue text-[17px] font-bold text-on-blue active:opacity-90"
      : "h-11 rounded-button text-[15px] font-medium text-gray-text";
  return <button type={type} className={`${base} ${styles} ${className}`} {...rest} />;
}

/** 화면 전체 틀. 위쪽 안전 영역을 비우고, 아래 고정 버튼 자리를 남긴다. */
export function Screen({
  children,
  className = "",
  withBottomBar = false,
  withTabBar = false,
}: {
  children: ReactNode;
  className?: string;
  /** 아래에 고정 버튼 영역(BottomBar)이 있을 때 */
  withBottomBar?: boolean;
  /** 아래에 탭바(62px)가 있을 때 */
  withTabBar?: boolean;
}) {
  return (
    <main
      className={`flex flex-1 flex-col px-4 pt-[calc(16px+env(safe-area-inset-top))] ${
        withBottomBar ? "pb-52" : withTabBar ? "pb-[calc(88px+env(safe-area-inset-bottom))]" : "pb-[calc(24px+env(safe-area-inset-bottom))]"
      } ${className}`}
    >
      {children}
    </main>
  );
}

/** 화면 아래에 고정되는 버튼 영역 */
export function BottomBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`fixed bottom-0 left-1/2 z-10 w-full max-w-[480px] -translate-x-1/2 px-4 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))] ${className}`}
    >
      {children}
    </div>
  );
}

/** 온보딩 아래 점 표시 */
export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex justify-center gap-1.5" role="img" aria-label={`${total}단계 중 ${current + 1}단계`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-2 rounded-full transition-all ${i === current ? "w-5 bg-green" : "w-2 bg-line"}`} />
      ))}
    </div>
  );
}

/** 오른쪽 위 작은 알약 버튼 (건너뛰기 등) */
export function PillButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-line px-3.5 py-1.5 text-[13px] font-medium text-gray-text active:opacity-80"
    >
      {children}
    </button>
  );
}

/** 큰 제목 */
export function Heading({ children, size = "lg" }: { children: ReactNode; size?: "lg" | "md" }) {
  return (
    <h1 className={`font-extrabold leading-[1.4] tracking-[-0.6px] ${size === "lg" ? "text-2xl" : "text-[21px]"}`}>
      {children}
    </h1>
  );
}

export function SubText({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`mt-2 text-[15px] leading-[1.6] text-gray-text ${className}`}>{children}</p>;
}
