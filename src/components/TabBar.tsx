"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; match: string[]; icon: React.ReactNode };

// 아이콘 경로는 design/screens.html의 TABS와 같다.
const TABS: Tab[] = [
  {
    href: "/home/",
    label: "홈",
    match: ["/home", "/settings"], // 설정은 홈 오른쪽 위에서 들어가므로 홈 탭이 켜진다
    icon: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  },
  {
    href: "/bible/",
    label: "성경",
    match: ["/bible"],
    icon: <path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z" />,
  },
  {
    href: "/vineyard/",
    label: "포도원",
    match: ["/vineyard"],
    icon: (
      <>
        <circle cx="8" cy="10" r="3" />
        <circle cx="16" cy="10" r="3" />
        <circle cx="12" cy="16" r="3" />
      </>
    ),
  },
  {
    href: "/records/",
    label: "기록",
    match: ["/records"],
    icon: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M9 11h7M9 15h5" />
      </>
    ),
  },
];

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="하단 탭"
      className="fixed bottom-0 left-1/2 z-10 flex h-[62px] w-full max-w-[480px] -translate-x-1/2 justify-around border-t border-line bg-card pt-2 pb-[env(safe-area-inset-bottom)]"
    >
      {TABS.map((tab) => {
        const on = tab.match.some((m) => pathname.startsWith(m));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={on ? "page" : undefined}
            className={`flex w-16 flex-col items-center gap-0.5 text-[10px] ${
              on ? "font-bold text-brand" : "text-gray"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill={on && tab.href === "/home/" ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            >
              {tab.icon}
            </svg>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
