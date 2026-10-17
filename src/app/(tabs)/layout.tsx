import TabBar from "@/components/TabBar";

// 탭바가 보이는 화면: 홈 · 성경 · 포도원 · 기록 · 설정
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TabBar />
    </>
  );
}
