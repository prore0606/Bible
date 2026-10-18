"use client";

import { useRouter } from "next/navigation";
import { Mascot } from "@/components/art/Mascot";
import { BottomBar, Button, Heading, Screen, SubText } from "@/components/ui";

// 04 시작하기: MVP 에서는 "로그인 없이 바로 시작하기"만 보인다 (카카오·Google 로그인은 다음 업데이트)
export default function StartPage() {
  const router = useRouter();
  return (
    <Screen withBottomBar>
      <section className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
        <Mascot size={120} title="알알이" />
        <div className="mt-3">
          <Heading>
            알알이와 함께
            <br />
            시작해 볼까요?
          </Heading>
          <SubText>가입 없이 바로 시작할 수 있어요</SubText>
        </div>
      </section>
      <BottomBar className="bg-bg">
        <Button onClick={() => router.push("/setup/book/")}>로그인 없이 바로 시작하기</Button>
      </BottomBar>
    </Screen>
  );
}
