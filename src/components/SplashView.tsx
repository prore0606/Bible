import { Mascot } from "@/components/art/Mascot";

export const CONCEPT_SENTENCE = "열매 맺는 문화를 만들어 갑시다";
export const TAGLINE = "하루 1장, 열매 맺는 말씀 습관";
export const CONCEPT_VERSE = "나는 포도나무요 너희는 가지라 · 요 15:5";

/**
 * 01 스플래시 (docs/spec.md 5장). 앱을 켜서 저장소가 준비될 때까지 보이는 화면(BootScreen)과 같은 모양이라
 * 준비가 끝나도 화면이 바뀐 느낌 없이 이어진다.
 */
export default function SplashView() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-cream-1 to-cream-2 px-4 pb-24 text-center">
      <Mascot size={132} title="알알이" />
      <h1 className="mt-3 text-[30px] font-extrabold tracking-[-1px]">
        성경-<span className="text-green">말씀숲</span>
      </h1>
      <p className="mt-2 text-[16px] font-semibold text-ink/70">{CONCEPT_SENTENCE}</p>
      <p className="mt-1 text-[14px] text-gray">{TAGLINE}</p>
      <p className="absolute bottom-[calc(40px+env(safe-area-inset-bottom))] text-[13px] text-gray">{CONCEPT_VERSE}</p>
    </main>
  );
}
