"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookSproutArt } from "@/components/art/FirstRunArt";
import { Mascot } from "@/components/art/Mascot";
import { CONCEPT_SENTENCE } from "@/components/SplashView";
import { BottomBar, Button, Heading, PillButton, Screen, StepDots, SubText } from "@/components/ui";

const TOTAL_STEPS = 2;

// 02·03 온보딩 (한 경로, 2장): 컨셉 → 오늘의 미션 소개
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const goStart = () => router.push("/start/");

  return (
    <Screen withBottomBar>
      <div className="flex justify-end">
        <PillButton onClick={goStart}>건너뛰기</PillButton>
      </div>

      {step === 0 ? (
        <section className="flex flex-1 flex-col items-center pt-4 text-center" aria-label="컨셉">
          <BookSproutArt />
          <p className="mt-4 text-[13px] font-bold text-brand">{CONCEPT_SENTENCE}</p>
          <div className="mt-2">
            <Heading>
              하루 1장,
              <br />
              말씀으로 열매 맺어요
            </Heading>
            <SubText>
              읽은 날만큼 포도나무가 자라고
              <br />
              남긴 기도는 포도알이 돼요
            </SubText>
          </div>
        </section>
      ) : (
        <section className="flex-1 pt-4" aria-label="오늘의 미션">
          <Heading>
            오늘의 미션은
            <br />
            딱 2가지예요
          </Heading>
          <SubText>5~10분이면 충분해요</SubText>

          <ol className="mt-6 space-y-2.5">
            <MissionCard number={1} title="1장 읽기" description="내가 고른 곳부터 차례대로" />
            <MissionCard number={2} title="한 줄 기도" description="읽은 말씀을 떠올리며 짧게" />
          </ol>

          <div className="mt-2.5 flex items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-line px-4 py-3.5">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="text-green">
              <path d="M6 3h12v18l-6-4-6 4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <div>
              <div className="text-[16px] font-bold text-ink/70">마음에 드는 구절은 저장</div>
              <div className="mt-0.5 text-[13px] text-gray">미션은 아니에요. 원할 때만!</div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-[12px] bg-butter px-3.5 py-3 text-[14px] font-semibold text-butter-text">
            <Mascot size={26} />
            2가지를 마치면 포도알 하나가 맺혀요
          </div>
        </section>
      )}

      <BottomBar className="bg-bg">
        <div className="mb-5">
          <StepDots total={TOTAL_STEPS} current={step} />
        </div>
        <Button onClick={() => (step === 0 ? setStep(1) : goStart())}>{step === 0 ? "다음" : "좋아요"}</Button>
      </BottomBar>
    </Screen>
  );
}

function MissionCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <li className="flex items-center gap-3.5 rounded-[14px] bg-card px-4 py-4 shadow-card">
      <span className="text-[22px] font-extrabold text-grape">{number}</span>
      <div>
        <div className="text-[16px] font-bold">{title}</div>
        <div className="mt-0.5 text-[13px] text-gray">{description}</div>
      </div>
    </li>
  );
}
