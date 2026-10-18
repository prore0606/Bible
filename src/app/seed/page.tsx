"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { appStore } from "@/app/store";
import { FirstSeedArt } from "@/components/art/FirstRunArt";
import { BottomBar, Button, Heading, SubText } from "@/components/ui";

// 07 첫 씨앗: 들어오면 onboarded = true 를 저장하고, 버튼을 누르면 홈으로 간다
export default function SeedPage() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // 개발 모드의 이중 실행에도 한 번만
    started.current = true;
    appStore
      .getState()
      .updateSettings({ onboarded: true })
      .then(() => setSaved(true))
      .catch((e) => setError(e instanceof Error ? e.message : "저장하지 못했어요."));
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center bg-gradient-to-b from-warm-from to-butter px-4 pt-[calc(56px+env(safe-area-inset-top))] text-center">
      <FirstSeedArt />
      <div className="mt-2">
        <Heading>첫 씨앗을 심었어요!</Heading>
        <SubText>
          오늘의 미션을 마치면
          <br />
          싹이 트고 포도나무로 자라요
        </SubText>
      </div>
      <BottomBar>
        {error && <p className="mb-2 text-[13px] text-butter-text">{error}</p>}
        <Button onClick={() => router.replace("/home/")} disabled={!saved}>
          오늘의 미션 하러 가기
        </Button>
      </BottomBar>
    </main>
  );
}
