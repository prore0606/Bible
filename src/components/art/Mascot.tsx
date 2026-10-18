// design/screens.html 의 SVG(#mascot, #logo, #spark)를 그대로 옮긴 것. 새로 그리지 않는다.
// 그림 안의 색은 원본 그대로이며 디자인 토큰 규칙의 예외다 (일러스트는 테마와 무관하게 같은 모습).

type ArtProps = { size?: number; className?: string; title?: string };

const a11y = (title?: string) => (title ? { role: "img", "aria-label": title } : { "aria-hidden": true });

/** 마스코트 '알알이'의 모양만 (viewBox 0 0 100 100 안에서 그려진다) */
export function MascotShapes() {
  return (
    <>
      <path d="M52 22 C49 14 54 8 62 6" stroke="#36B37E" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M58 14 C66 4 80 4 85 10 C77 18 66 19 58 14Z" fill="#36B37E" />
      <g fill="#B9A2F3">
        <circle cx="30" cy="36" r="13" />
        <circle cx="50" cy="32" r="13" />
        <circle cx="70" cy="36" r="13" />
        <circle cx="38" cy="58" r="13" />
        <circle cx="62" cy="58" r="13" />
        <circle cx="50" cy="80" r="13" />
      </g>
      <circle cx="50" cy="54" r="23" fill="#7C5CDB" />
      <circle cx="43" cy="51" r="3" fill="#191F28" />
      <circle cx="57" cy="51" r="3" fill="#191F28" />
      <path d="M44 60 Q50 66 56 60" stroke="#191F28" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="37" cy="59" r="3.5" fill="#F59AB5" opacity=".85" />
      <circle cx="63" cy="59" r="3.5" fill="#F59AB5" opacity=".85" />
      <circle cx="42" cy="44" r="7" fill="#fff" opacity=".18" />
    </>
  );
}

export function Mascot({ size = 96, className, title }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} {...a11y(title)}>
      <MascotShapes />
    </svg>
  );
}

export function Logo({ size = 56, className, title }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" className={className} {...a11y(title)}>
      <path d="M28 14 C30 6 38 4 44 6 C42 12 36 15 28 14Z" fill="#36B37E" />
      <g fill="#7C5CDB">
        <circle cx="18" cy="24" r="8" />
        <circle cx="30" cy="22" r="8" />
        <circle cx="42" cy="24" r="8" />
        <circle cx="24" cy="35" r="8" />
        <circle cx="36" cy="35" r="8" />
        <circle cx="30" cy="46" r="8" />
      </g>
    </svg>
  );
}

const SPARK_PATH = "M10 0l2.5 7.5L20 10l-7.5 2.5L10 20l-2.5-7.5L0 10l7.5-2.5z";

/** 큰 그림 안에 끼워 넣는 반짝이 (바깥 <svg> 안에서 x, y, 크기를 지정) */
export function SparkAt({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 20 20">
      <path d={SPARK_PATH} fill="#FFB938" />
    </svg>
  );
}
