// design/screens.html 의 원본 스크립트를 그대로 실행해서, 옮겨 만든 TS 코드와 글자 단위로 비교한다.
// "똑같이 옮겼다"를 눈이 아니라 테스트로 증명하기 위한 것 (docs/roadmap.md T8).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cycleDay, isMilestoneDay, nextMsg, sceneTrees, stageName, todayMsg, treeNo } from "@/lib/growth";
import { sceneSvg, vineG } from "@/lib/vineSvg";

type Original = {
  vineG(d: number): string;
  scene(d: number): string;
  todayMsg(d: number): string;
  nextMsg(d: number): string;
  stageOf(r: number): [number, string, string];
  cyc(d: number): number;
  treeNo(d: number): number;
};

function loadOriginal(): Original {
  const html = readFileSync(join(process.cwd(), "design", "screens.html"), "utf8");
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const script = scripts[scripts.length - 1][1];
  const start = script.indexOf("var G='#36B37E'");
  const end = script.indexOf("var DAY=50");
  if (start < 0 || end < 0 || end < start) throw new Error("screens.html 에서 포도원 스크립트 구간을 찾지 못했습니다");
  const body = script.slice(start, end);
  // 화면(DOM)을 건드리지 않는 순수 계산 구간만 실행한다
  return new Function(`${body}; return { vineG, scene, todayMsg, nextMsg, stageOf, cyc, treeNo };`)() as Original;
}

const original = loadOriginal();
const DAYS_TO_300 = Array.from({ length: 300 }, (_, i) => i + 1);

describe("원본 screens.html 과의 일치", () => {
  it("원본 스크립트를 읽어 왔다", () => {
    expect(typeof original.vineG).toBe("function");
    expect(original.vineG(1).length).toBeGreaterThan(50);
  });

  it("한 그루 그림 vineG: 1~100일 모두 같다", () => {
    for (let d = 1; d <= 100; d += 1) {
      expect(vineG(d), `vineG(${d})`).toBe(original.vineG(d));
    }
  });

  it("포도원 장면 scene: 1~300일 모두 같다 (새 나무가 3그루까지 나란히 서는 구간 포함)", () => {
    for (const d of DAYS_TO_300) {
      expect(sceneSvg(d), `scene(${d})`).toBe(original.scene(d));
    }
  });

  it("오늘 자란 것 todayMsg: 1~400일 모두 같다", () => {
    for (let d = 1; d <= 400; d += 1) {
      expect(todayMsg(d), `todayMsg(${d})`).toBe(original.todayMsg(d));
    }
  });

  it("다음 변화 nextMsg: 1~400일 모두 같다", () => {
    for (let d = 1; d <= 400; d += 1) {
      expect(nextMsg(d), `nextMsg(${d})`).toBe(original.nextMsg(d));
    }
  });

  it("단계 이름, 나무 번호, 이번 나무의 날수가 같다", () => {
    for (let d = 1; d <= 400; d += 1) {
      const r = original.cyc(d);
      expect(cycleDay(d)).toBe(r);
      expect(treeNo(d)).toBe(original.treeNo(d));
      const stage = original.stageOf(r)[1];
      expect(stageName(d)).toBe((d > 100 ? "포도원 · " : "") + stage);
    }
  });
});

describe("원본에 없던 규칙", () => {
  it("3그루를 넘으면 최근 3그루만 그린다 (원본은 4그루부터 겹쳐 넘침)", () => {
    // 450일 = 다 자란 나무 4그루 + 자라는 나무 1그루(50일째) → 5그루 중 최근 3그루만 그리고 2그루는 숫자로
    const svg = sceneSvg(450);
    const groups = svg.match(/<g transform="translate/g) ?? [];
    expect(groups).toHaveLength(3);
    expect(sceneTrees(450)).toEqual({ visible: [100, 100, 50], hidden: 2 });
  });

  it("이정표 날에만 반짝이가 붙는다", () => {
    const sparks = (d: number) => (sceneSvg(d).match(/scale\(0\.[0-9]+\)" d="M10 0l2\.5/g) ?? []).length;
    expect(isMilestoneDay(30)).toBe(true);
    expect(sparks(30)).toBe(3);
    expect(sparks(31)).toBe(0);
  });
});

describe("처진 잎 (어제를 놓친 상태, 결정 D-03)", () => {
  const leafCount = (svg: string) => (svg.match(/<ellipse cx="[0-9.]+" cy="[0-9.]+" rx="[0-9.]+" ry="[0-9.]+" fill=/g) ?? []).length;

  it("씨앗(1일)에는 잎이 없어서 그림이 같다", () => {
    expect(vineG(1, true)).toBe(vineG(1));
  });

  it("2일 이상은 모양이 달라진다 (잎이 처진다)", () => {
    for (const d of [2, 3, 5, 10, 14, 21, 30, 50, 70, 100]) {
      expect(vineG(d, true), `d=${d}`).not.toBe(vineG(d));
    }
  });

  it("잎이 사라지지 않는다: 잎 개수는 그대로", () => {
    for (let d = 2; d <= 100; d += 1) {
      expect(leafCount(vineG(d, true)), `d=${d}`).toBe(leafCount(vineG(d)));
    }
  });

  it("처진 잎은 오른쪽 가지는 +50°, 왼쪽 가지는 -50° 로 눕는다", () => {
    const svg = vineG(30, true);
    expect(svg).toContain("rotate(50 ");
    expect(svg).toContain("rotate(-50 ");
  });

  it("줄기·덩굴손·포도송이·지지대는 그대로다 (잎만 달라짐)", () => {
    const strip = (svg: string) => svg.replace(/<ellipse[^>]*\/>/g, "");
    for (const d of [14, 30, 50, 100]) {
      expect(strip(vineG(d, true)), `d=${d}`).toBe(strip(vineG(d)));
    }
  });

  it("장면 전체에도 적용되고, wilt 를 끄면 원본과 같다", () => {
    expect(sceneSvg(50, { wilt: true })).not.toBe(sceneSvg(50));
    expect(sceneSvg(50, { wilt: false })).toBe(original.scene(50));
  });
});
