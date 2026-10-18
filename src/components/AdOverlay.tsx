import { Mascot } from "@/components/art/Mascot";

/** 웹 개발 모드에서 보상형 광고 대신 보여 주는 "광고 자리" 화면. 실제 광고는 AdMob 이 직접 화면을 띄운다. */
export default function AdOverlay({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-ink px-6 text-center text-bg"
    >
      <span className="rounded bg-gold px-2 py-0.5 text-[12px] font-bold text-ink">광고</span>
      <Mascot size={64} />
      <b className="text-[17px]">보상형 광고 영역</b>
      <p className="text-[13px] opacity-75">{message}</p>
    </div>
  );
}
