import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable.css";
import "@/styles/nanum-myeongjo.css";
import "./globals.css";
import AppProvider from "@/components/AppProvider";

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
    <html lang="ko" className="h-full">
      <body className="min-h-full">
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-bg">
          <AppProvider>{children}</AppProvider>
        </div>
      </body>
    </html>
  );
}
