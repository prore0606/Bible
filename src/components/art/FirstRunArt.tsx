// design/screens.html 02(온보딩 1)와 07(첫 씨앗)의 일러스트를 그대로 옮긴 것. 색은 원본 그대로(토큰 규칙의 예외).
import { MascotShapes, SparkAt } from "./Mascot";

/** 02 온보딩 1: 펼친 책에서 새싹이 자라는 그림 */
export function BookSproutArt({ className }: { className?: string }) {
  return (
    <svg width="240" height="228" viewBox="0 0 200 190" className={className} aria-hidden="true">
      <circle cx="100" cy="95" r="82" fill="#FFF4DC" />
      <path d="M52 132 L100 140 L148 132 L148 108 L100 116 L52 108Z" fill="#fff" stroke="#C9BFA5" strokeWidth="2" />
      <line x1="100" y1="116" x2="100" y2="140" stroke="#C9BFA5" strokeWidth="2" />
      <path d="M100 116 C96 96 104 80 112 66" stroke="#36B37E" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <ellipse cx="88" cy="88" rx="13" ry="6" fill="#36B37E" transform="rotate(-25 88 88)" />
      <path d="M110 70 C120 56 136 56 142 62 C134 72 120 74 110 70Z" fill="#36B37E" />
      <g fill="#A58BF0">
        <circle cx="118" cy="88" r="6" />
        <circle cx="130" cy="88" r="6" />
        <circle cx="124" cy="98" r="6" />
      </g>
      <SparkAt x={40} y={44} size={14} />
      <SparkAt x={150} y={40} size={10} />
    </svg>
  );
}

/** 07 첫 씨앗: 흙 속에 씨앗을 심는 알알이 */
export function FirstSeedArt({ className }: { className?: string }) {
  return (
    <svg width="264" height="216" viewBox="0 0 220 180" className={className} aria-hidden="true">
      <SparkAt x={40} y={30} size={16} />
      <SparkAt x={168} y={22} size={12} />
      <SparkAt x={176} y={90} size={10} />
      <ellipse cx="110" cy="150" rx="88" ry="16" fill="#E9D3A6" />
      <path d="M66 148 Q110 108 154 148Z" fill="#D9B97E" />
      <ellipse cx="110" cy="124" rx="11" ry="8" fill="#8A6A45" />
      <path d="M110 116 C108 104 114 96 120 92" stroke="#36B37E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <svg x="26" y="70" width="54" height="54" viewBox="0 0 100 100">
        <MascotShapes />
      </svg>
      <path d="M70 100 l12 6" stroke="#8ED0E8" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 5" />
    </svg>
  );
}
