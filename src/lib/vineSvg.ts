// 포도원 그림 (docs/spec.md 7.5). design/screens.html 의 vineG(d), scene(d) 를 SVG 문자열을 만드는 순수 함수로 옮긴 것.
// 계산 순서와 문자열이 원본과 똑같아야 하므로 식을 바꾸지 않는다 (tests/lib/vineGolden.test.ts 가 원본과 글자 단위로 비교).
// 그림 안의 색은 원본 그대로이며 디자인 토큰 규칙의 예외다.
import { isMilestoneDay, sceneTrees } from "@/lib/growth";

const G = "#36B37E";
const GL = "#5CC793";
const BR = "#8A6A45";
/** 어제를 놓쳤을 때 잎 색: 조금 가라앉은 초록 */
const G_WILT = "#74B795";

type LeafSlot = { x: number; y: number; r: number; side: "s" | "l" | "r"; o?: number };

// 잎 자리: 줄기에 6장, 그다음 철사를 따라 좌우로 번갈아
const LS: LeafSlot[] = [];
[160, 146, 132, 118, 104, 92].forEach((y, i) => {
  LS.push({ x: 120 + (i % 2 ? 11 : -11), y, r: i % 2 ? 30 : -30, side: "s" });
});
for (let k = 0; k < 12; k += 1) {
  const off = 16 + k * 6;
  LS.push({ x: 120 - off, y: 72 + (k % 2 ? -5 : 5), r: k % 2 ? -20 : 15, side: "l", o: off });
  LS.push({ x: 120 + off, y: 72 + (k % 2 ? 5 : -5), r: k % 2 ? 20 : -15, side: "r", o: off });
}
const FP = [46, 194, 70, 170, 96, 144, 58, 182, 84, 156];

function lerp(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.substr(i, 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.substr(i, 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`;
}

function leafS(x: number, y: number, r: number, s: number, c?: string): string {
  return `<ellipse cx="${x}" cy="${y}" rx="${10 * s}" ry="${5.2 * s}" fill="${c || G}" transform="rotate(${r} ${x} ${y})"/>`;
}

function curl(x: number, y: number, dir: number): string {
  return `<path d="M${x} ${y} q${4 * dir} -6 ${8 * dir} -2 q3 3 -1 6 q-3 1 -3 -2" stroke="${GL}" stroke-width="1.3" fill="none"/>`;
}

/**
 * 한 그루의 그림. d = 그 나무의 성장일(1~100).
 * wilt 가 true 이면(어제를 놓친 상태) 잎이 줄기 쪽에서 아래로 살짝 처지고 색이 가라앉는다.
 * 잎이 사라지거나 시들어 죽지는 않는다 — 오늘 미션을 마치면 바로 원래 모습으로 돌아온다 (spec 7.3).
 */
export function vineG(d: number, wilt = false): string {
  // 처진 잎: 줄기 오른쪽 잎은 오른쪽 끝이, 왼쪽 잎은 왼쪽 끝이 아래로 내려간다 (각도를 ±50° 로 눕히고 2 만큼 내림)
  const leaf = (x: number, y: number, r: number, s: number, c?: string): string => {
    if (!wilt) return leafS(x, y, r, s, c);
    return leafS(x, y + 2, x >= 120 ? 50 : -50, s, c ?? G_WILT);
  };

  let s = "";
  if (d >= 10)
    s += `<g opacity="${d >= 14 ? 1 : 0.45}"><g stroke="#B49A6E" stroke-width="2.5" stroke-linecap="round"><line x1="34" y1="70" x2="34" y2="186"/><line x1="206" y1="70" x2="206" y2="186"/></g><line x1="34" y1="78" x2="206" y2="78" stroke="#C9B48A" stroke-width="1.5"/><line x1="34" y1="112" x2="206" y2="112" stroke="#C9B48A" stroke-width="1.5"/></g>`;
  if (d < 21) s += `<path d="M86 188 Q120 ${d < 3 ? 160 : 170} 154 188Z" fill="#D9B97E"/>`;
  if (d === 1)
    return `${s}<ellipse cx="120" cy="174" rx="9" ry="6.5" fill="${BR}"/><path d="M114 172 q6 -4 12 0" stroke="#A9895F" stroke-width="1.2" fill="none"/>`;

  const top = d >= 14 ? 80 : 178 - (d - 1) * 7.5;
  const w = 2 + Math.min(5, d / 18);
  const mid = (184 + top) / 2;
  s += `<path d="M120 186 C117 ${mid + 10} 123 ${mid - 10} 120 ${top}" stroke="${d < 21 ? GL : BR}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;

  const L = d < 14 ? 0 : Math.min(86, (d - 13) * 12);
  const R = d < 21 ? 0 : Math.min(86, (d - 20) * 10);
  if (L)
    s += `<path d="M120 82 C${120 - L * 0.4} 72 ${120 - L * 0.7} 80 ${120 - L} 79" stroke="${d < 30 ? GL : "#7C6A45"}" stroke-width="${2.5 + Math.min(2, d / 50)}" fill="none" stroke-linecap="round"/>`;
  if (R)
    s += `<path d="M120 82 C${120 + R * 0.4} 72 ${120 + R * 0.7} 80 ${120 + R} 79" stroke="${d < 30 ? GL : "#7C6A45"}" stroke-width="${2.5 + Math.min(2, d / 50)}" fill="none" stroke-linecap="round"/>`;

  // 떡잎
  if (d >= 3 && d < 21) {
    const cy = d < 5 ? top + 5 : 163;
    const cs = d === 3 ? 0.7 : 0.95;
    s += leaf(112, cy, -25, cs, "#9ADBB8") + leaf(128, cy, 25, cs, "#9ADBB8");
  }
  // 싹 끝
  if (d === 2) s += leaf(116, top + 2, -40, 0.45, "#9ADBB8") + leaf(124, top + 2, 40, 0.45, "#9ADBB8");

  // 본잎
  const n = d < 5 ? 0 : Math.min(d - 4, 30);
  let c = 0;
  for (let i = 0; i < LS.length && c < n; i += 1) {
    const p = LS[i];
    const ok = p.side === "s" ? p.y > top + 6 : p.side === "l" ? (p.o as number) <= L : (p.o as number) <= R;
    if (!ok) continue;
    c += 1;
    s += leaf(p.x, p.y, p.r, p.side === "s" ? 0.9 : 1);
  }

  // 덩굴손
  if (d >= 10) {
    const tn = Math.min(d - 9, 8);
    const TP = [
      [124, top + 14, 1],
      [116, top + 26, -1],
      [120 - Math.max(L, 20) + 4, 74, -1],
      [120 + Math.max(R, 20) - 4, 74, 1],
      [90, 86, -1],
      [150, 86, 1],
      [70, 84, -1],
      [172, 84, 1],
    ];
    for (let t = 0; t < tn; t += 1) {
      if ((t === 3 && !R) || (t === 5 && !R) || (t === 7 && !R)) continue;
      s += curl(TP[t][0], TP[t][1], TP[t][2]);
    }
  }

  // 꽃 (30~39일)
  if (d >= 30 && d < 40) {
    for (let f = 0; f < Math.min(d - 29, 10); f += 1) {
      const fx = FP[f];
      s += `<g fill="#F4EBC8" stroke="#D8C98E" stroke-width=".6"><circle cx="${fx}" cy="90" r="2.6"/><circle cx="${fx - 3}" cy="95" r="2.4"/><circle cx="${fx + 3}" cy="95" r="2.4"/><circle cx="${fx}" cy="100" r="2.2"/></g>`;
    }
  }

  // 포도 송이 (40일~)
  if (d >= 40) {
    const nc = Math.min(2 + Math.floor((d - 40) / 5), 10);
    const rip = Math.max(0, Math.min(1, (d - 50) / 45));
    const rr = 3.1 + Math.min(1.7, (d - 40) / 35);
    const rows = d < 47 ? [3, 2, 1] : [4, 3, 2, 1];
    const c1 = rip < 0.5 ? lerp("#A8CF7E", "#C77FA8", rip * 2) : lerp("#C77FA8", "#7C5CDB", rip * 2 - 1);
    const c2 = rip < 0.5 ? lerp("#8FBF66", "#D59AC0", rip * 2) : lerp("#D59AC0", "#A58BF0", rip * 2 - 1);
    for (let g = 0; g < nc; g += 1) {
      const gx = FP[g];
      const gy = 88;
      s += `<path d="M${gx} 80 v${gy - 82}" stroke="#7C6A45" stroke-width="1.2"/>`;
      rows.forEach((cnt, ri) => {
        for (let q = 0; q < cnt; q += 1) {
          const x = gx + (q - (cnt - 1) / 2) * rr * 2;
          const y = gy + ri * rr * 1.7;
          s += `<circle cx="${x}" cy="${y}" r="${rr}" fill="${(q + ri) % 2 ? c2 : c1}"/>`;
        }
      });
    }
  }
  return s;
}

function spark(x: number, y: number, sc: number): string {
  return `<path transform="translate(${x} ${y}) scale(${sc})" d="M10 0l2.5 7.5L20 10l-7.5 2.5L10 20l-2.5-7.5L0 10l7.5-2.5z" fill="#FFB938"/>`;
}

/**
 * 포도원 전체 장면 (viewBox 0 0 240 200 안). d = 포도원 성장일.
 * 100일을 채운 나무는 그대로 서 있고 새 나무가 옆에서 자란다. 3그루를 넘으면 최근 3그루만 그린다(나머지는 숫자로 알림).
 */
export function sceneSvg(d: number, opts: { wilt?: boolean } = {}): string {
  let s = `<circle cx="206" cy="30" r="13" fill="#FFB938" opacity=".9"/><ellipse cx="120" cy="192" rx="122" ry="14" fill="#E9D3A6"/>`;
  const trees = sceneTrees(d).visible;
  if (trees.length === 1) {
    s += vineG(trees[0], opts.wilt);
  } else {
    const sc = trees.length === 2 ? 0.6 : trees.length === 3 ? 0.46 : 0.38;
    const wv = 240 * sc;
    const gap = (240 - wv * trees.length) / (trees.length + 1);
    trees.forEach((vd, i) => {
      s += `<g transform="translate(${gap + i * (wv + gap)} ${200 - 200 * sc - 4}) scale(${sc})">${vineG(vd, opts.wilt)}</g>`;
    });
  }
  if (isMilestoneDay(d)) s += spark(22, 26, 0.7) + spark(60, 14, 0.45) + spark(178, 58, 0.5);
  return s;
}
