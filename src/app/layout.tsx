import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable.css";
import "@/styles/nanum-myeongjo.css";
import "./globals.css";
import AppProvider from "@/components/AppProvider";
import { themeInitScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "성경-말씀숲",
  description: "하루 1장, 열매 맺는 말씀 습관",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: 아래 스크립트가 React 보다 먼저 <html data-theme> 를 바꾸기 때문 (Next.js 문서의 방식)
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
      </head>
      <body className="min-h-full">
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-bg">
          <AppProvider>{children}</AppProvider>
        </div>
      </body>
    </html>
  );
}
