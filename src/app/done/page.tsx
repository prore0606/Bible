"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { appStore, useAppStore } from "@/app/store";
import { DoneArt } from "@/components/art/DoneArt";
import BottomSheet from "@/components/BottomSheet";
import HomeView from "@/components/HomeView";
import { Button } from "@/components/ui";
import { isMilestoneDay, todayMsg } from "@/lib/growth";
import { completionSummary, savedOnDate } from "@/lib/pray";

// 12 미션 완료 (docs/spec.md 5장): 홈 위에 어두운 배경 + 바텀시트로 포도알이 맺힌 것을 축하한다
export default function DonePage() {
  const router = useRouter();
  const completed = useAppStore((s) => s.lastCompleted);
  const stats = useAppStore((s) => s.stats);
  const savedVerses = useAppStore((s) => s.savedVerses);

  useEffect(() => {
    if (!completed) router.replace("/home/"); // 주소로 직접 열었거나 새로고침한 경우
  }, [completed, router]);

  if (!completed || !stats) return null;

  const growthDay = stats.growthDay; // 완료한 날 수 + 1 (완료 직후의 포도원 성장일)
  const milestone = isMilestoneDay(growthDay);
  const savedCount = savedOnDate(savedVerses, completed.date).length;

  const goHome = () => {
    appStore.getState().leaveFlow();
    router.replace("/home/");
  };

  return (
    <>
      <HomeView />
      <BottomSheet label="오늘 미션 완료" onClose={goHome}>
        <h1 className="pr-8 text-[21px] leading-[1.4] font-extrabold tracking-[-0.5px]">
          오늘 미션 완료!
          <br />
          포도알 하나가 맺혔어요
        </h1>
        <p className="mt-1 text-[14px] text-gray">{completionSummary(completed, savedCount)}</p>

        <div className="my-2">
          <DoneArt extra={milestone} />
        </div>

        <div className="mb-4 text-center">
          <div className="text-[12px] text-gray">오늘 자란 것</div>
          <p className="mt-0.5 text-[15px] font-bold text-green">{todayMsg(growthDay)}</p>
        </div>

        <Button onClick={() => router.replace("/vineyard/")}>나의 포도원 보기</Button>
        <Button variant="ghost" onClick={goHome} className="mt-1">
          홈으로
        </Button>
      </BottomSheet>
    </>
  );
}
