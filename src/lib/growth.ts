// 포도원 성장 (docs/spec.md 7.5). design/screens.html의 MS, cyc, treeNo, stageOf, todayMsg, nextMsg, scene을 옮긴 것.
// 성장일 = 완료한 날 수 + 1 (첫 씨앗 = 1일). 100일마다 새 나무가 씨앗부터 다시 자란다.

export type Milestone = { day: number; name: string; message: string };

export const MILESTONES: readonly Milestone[] = [
  { day: 1, name: "씨앗", message: "흙 속에 씨앗을 심어요" },
  { day: 2, name: "싹 틈", message: "흙을 뚫고 작은 싹이 올라와요" },
  { day: 3, name: "떡잎", message: "떡잎 두 장이 펴져요" },
  { day: 5, name: "본잎", message: "첫 포도잎이 나와요" },
  { day: 7, name: "어린 줄기", message: "줄기가 쭉 자라요 · 1주 축하" },
  { day: 10, name: "덩굴손", message: "덩굴손이 나와 지지대를 찾아요" },
  { day: 14, name: "지지대 타기", message: "지지대를 감고 올라가요 · 2주 축하" },
  { day: 21, name: "가지 뻗기", message: "양옆으로 가지가 퍼져요" },
  { day: 30, name: "꽃", message: "작은 포도꽃이 피어요 · 한 달 축하" },
  { day: 40, name: "초록 송이", message: "덜 익은 초록 송이가 맺혀요" },
  { day: 50, name: "익어 가는 송이", message: "송이가 보라색으로 물들기 시작해요" },
  { day: 70, name: "굵어지는 송이", message: "포도알이 굵어지고 진해져요" },
  { day: 100, name: "포도나무", message: "송이가 주렁주렁 · 100일 축하" },
];

/** 한 화면에 그리는 나무의 최대 수. 이보다 많으면 나머지는 숫자로 표시한다. */
export const MAX_VISIBLE_TREES = 3;

/** 완료한 날 수 → 성장일 */
export function growthDay(completedDays: number): number {
  return completedDays + 1;
}

/** 현재 나무의 성장일(1~100). 101일째는 새 나무의 1일. */
export function cycleDay(day: number): number {
  return day > 100 ? ((day - 1) % 100) + 1 : day;
}

/** 지금 자라는 나무가 몇 번째인지 (1부터) */
export function treeNo(day: number): number {
  return Math.ceil(day / 100);
}

function milestoneAt(cycle: number): Milestone | undefined {
  return MILESTONES.find((m) => m.day === cycle);
}

/** 이정표 날인지 (완료 시트에 반짝이를 넣는 날) */
export function isMilestoneDay(day: number): boolean {
  return milestoneAt(cycleDay(day)) !== undefined;
}

/** 단계 이름. 100일을 넘으면 "포도원 · " 이 붙는다. */
export function stageName(day: number): string {
  const cycle = cycleDay(day);
  let stage = MILESTONES[0];
  for (const m of MILESTONES) {
    if (m.day <= cycle) stage = m;
  }
  return (day > 100 ? "포도원 · " : "") + stage.name;
}

/** "오늘 자란 것" 문구 */
export function todayMsg(day: number): string {
  const cycle = cycleDay(day);
  const prefix = day > 100 ? `${treeNo(day)}번째 나무 · ` : "";
  const milestone = milestoneAt(cycle);
  if (milestone) return prefix + milestone.message;

  let text: string;
  if (cycle < 5) text = "떡잎이 조금 더 커졌어요";
  else if (cycle < 10) text = "잎이 한 장 더 났어요";
  else if (cycle < 14) text = "덩굴손이 하나 더 뻗었어요";
  else if (cycle < 21) text = "가지가 왼쪽으로 조금 더 뻗었어요";
  else if (cycle < 30) text = "가지에 잎이 한 장 더 났어요";
  else if (cycle < 40) text = "꽃이 하나 더 피었어요";
  else if (cycle < 50) text = (cycle - 40) % 5 === 0 ? "새 송이가 하나 생겼어요" : "송이가 조금 더 커졌어요";
  else text = (cycle - 40) % 5 === 0 ? "새 송이가 하나 생겼어요" : "포도가 조금 더 익었어요";
  return `${prefix}오늘: ${text}`;
}

/** "다음 변화" 문구 (예: "3일 뒤 · 꽃이 피어요") */
export function nextMsg(day: number): string {
  const cycle = cycleDay(day);
  if (cycle === 100) return `내일 · 포도원에 ${treeNo(day) + 1}번째 나무를 심어요`;
  const next = MILESTONES.find((m) => m.day > cycle);
  if (!next) return "";
  const gap = next.day - cycle;
  // "줄기가 쭉 자라요 · 1주 축하" 처럼 뒤에 붙은 축하 문구는 뺀다
  return `${gap === 1 ? "내일" : `${gap}일 뒤`} · ${next.message.replace(/ · .*$/, "")}`;
}

export type SceneTrees = {
  /** 화면에 그릴 나무들의 성장일(1~100). 오래된 것부터 */
  visible: number[];
  /** 화면에 못 그리고 숫자로만 알리는 나무 수 */
  hidden: number;
};

/**
 * 포도원에 서 있는 나무들. 100일을 채운 나무는 100으로 남고, 마지막 하나가 지금 자라는 나무다.
 * 3그루를 넘으면 가장 최근 3그루만 그리고 나머지는 숫자(hidden)로 알린다.
 */
export function sceneTrees(day: number): SceneTrees {
  const all: number[] = [];
  if (day <= 100) {
    all.push(day);
  } else {
    const full = Math.floor(day / 100);
    const rest = day - full * 100;
    for (let i = 0; i < full; i += 1) all.push(100);
    if (rest > 0) all.push(rest);
  }
  const hidden = Math.max(0, all.length - MAX_VISIBLE_TREES);
  return { visible: all.slice(hidden), hidden };
}
