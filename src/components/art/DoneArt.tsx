// design/screens.html 12(미션 완료)의 일러스트를 그대로 옮긴 것. 색은 원본 그대로(토큰 규칙의 예외).
import { MascotShapes, SparkAt } from "./Mascot";

/** 이정표 날(extra)에는 반짝이가 더 많고 깜빡인다 */
export function DoneArt({ extra = false }: { extra?: boolean }) {
  return (
    <svg width="180" height="168" viewBox="0 0 150 140" className="mx-auto" aria-hidden="true">
      <circle cx="75" cy="72" r="62" fill="#FFF4DC" />
      <SparkAt x={18} y={30} size={16} />
      <SparkAt x={118} y={24} size={12} />
      <SparkAt x={124} y={98} size={10} />
      {extra && (
        <g className="animate-pulse">
          <SparkAt x={8} y={78} size={11} />
          <SparkAt x={96} y={8} size={9} />
          <SparkAt x={132} y={58} size={14} />
          <SparkAt x={40} y={6} size={10} />
        </g>
      )}
      <svg x="25" y="20" width="100" height="100" viewBox="0 0 100 100">
        <MascotShapes />
      </svg>
    </svg>
  );
}
