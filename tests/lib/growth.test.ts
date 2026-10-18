import { describe, expect, it } from "vitest";
import {
  MILESTONES,
  cycleDay,
  growthDay,
  isMilestoneDay,
  nextMsg,
  sceneTrees,
  stageName,
  todayMsg,
  treeNo,
} from "@/lib/growth";

describe("growthDay (성장일 = 완료한 날 수 + 1)", () => {
  it("첫 씨앗 화면이 1일, 첫 미션을 마치면 2일", () => {
    expect(growthDay(0)).toBe(1);
    expect(growthDay(1)).toBe(2);
    expect(growthDay(99)).toBe(100);
  });
});

describe("cycleDay · treeNo", () => {
  it("100일까지는 그대로, 101일은 새 나무의 1일", () => {
    expect(cycleDay(1)).toBe(1);
    expect(cycleDay(100)).toBe(100);
    expect(cycleDay(101)).toBe(1);
    expect(cycleDay(200)).toBe(100);
    expect(cycleDay(201)).toBe(1);
  });

  it("몇 번째 나무인지", () => {
    expect(treeNo(1)).toBe(1);
    expect(treeNo(100)).toBe(1);
    expect(treeNo(101)).toBe(2);
    expect(treeNo(200)).toBe(2);
    expect(treeNo(201)).toBe(3);
  });
});

describe("이정표 (spec 7.5 표)", () => {
  it("13개 이정표 날이 spec과 같다", () => {
    expect(MILESTONES.map((m) => m.day)).toEqual([1, 2, 3, 5, 7, 10, 14, 21, 30, 40, 50, 70, 100]);
  });

  it("단계 이름", () => {
    expect(stageName(1)).toBe("씨앗");
    expect(stageName(4)).toBe("떡잎"); // 이정표 사이에서는 직전 단계
    expect(stageName(30)).toBe("꽃");
    expect(stageName(69)).toBe("익어 가는 송이");
    expect(stageName(100)).toBe("포도나무");
    expect(stageName(101)).toBe("포도원 · 씨앗");
    expect(stageName(130)).toBe("포도원 · 꽃");
  });

  it("이정표 날만 true (반짝이 연출)", () => {
    expect(isMilestoneDay(30)).toBe(true);
    expect(isMilestoneDay(31)).toBe(false);
    expect(isMilestoneDay(101)).toBe(true); // 새 나무의 씨앗
  });
});

describe("todayMsg", () => {
  it("이정표 날은 이정표 문구", () => {
    expect(todayMsg(1)).toBe("흙 속에 씨앗을 심어요");
    expect(todayMsg(7)).toBe("줄기가 쭉 자라요 · 1주 축하");
    expect(todayMsg(30)).toBe("작은 포도꽃이 피어요 · 한 달 축하");
    expect(todayMsg(100)).toBe("송이가 주렁주렁 · 100일 축하");
  });

  it("이정표가 아닌 날도 매일 하나씩 자란다 (구간별 문구)", () => {
    expect(todayMsg(4)).toBe("오늘: 떡잎이 조금 더 커졌어요");
    expect(todayMsg(6)).toBe("오늘: 잎이 한 장 더 났어요");
    expect(todayMsg(12)).toBe("오늘: 덩굴손이 하나 더 뻗었어요");
    expect(todayMsg(17)).toBe("오늘: 가지가 왼쪽으로 조금 더 뻗었어요");
    expect(todayMsg(25)).toBe("오늘: 가지에 잎이 한 장 더 났어요");
    expect(todayMsg(35)).toBe("오늘: 꽃이 하나 더 피었어요");
  });

  it("40일 이후에는 5일마다 새 송이", () => {
    expect(todayMsg(41)).toBe("오늘: 송이가 조금 더 커졌어요");
    expect(todayMsg(45)).toBe("오늘: 새 송이가 하나 생겼어요");
    expect(todayMsg(55)).toBe("오늘: 새 송이가 하나 생겼어요");
    expect(todayMsg(56)).toBe("오늘: 포도가 조금 더 익었어요");
    expect(todayMsg(99)).toBe("오늘: 포도가 조금 더 익었어요");
  });

  it("100일을 넘으면 몇 번째 나무인지 앞에 붙는다", () => {
    expect(todayMsg(101)).toBe("2번째 나무 · 흙 속에 씨앗을 심어요");
    expect(todayMsg(106)).toBe("2번째 나무 · 오늘: 잎이 한 장 더 났어요");
    expect(todayMsg(201)).toBe("3번째 나무 · 흙 속에 씨앗을 심어요");
  });

  it("모든 성장일(1~400)에서 빈 문구가 없다", () => {
    for (let d = 1; d <= 400; d += 1) {
      expect(todayMsg(d).length).toBeGreaterThan(0);
    }
  });
});

describe("nextMsg", () => {
  it("다음 이정표까지 남은 날", () => {
    expect(nextMsg(1)).toBe("내일 · 흙을 뚫고 작은 싹이 올라와요");
    expect(nextMsg(7)).toBe("3일 뒤 · 덩굴손이 나와 지지대를 찾아요");
    expect(nextMsg(27)).toBe("3일 뒤 · 작은 포도꽃이 피어요");
  });

  it("축하 문구(· 1주 축하)는 다음 변화에서 뺀다", () => {
    expect(nextMsg(6)).toBe("내일 · 줄기가 쭉 자라요");
    expect(nextMsg(98)).toBe("2일 뒤 · 송이가 주렁주렁");
  });

  it("100일째에는 새 나무를 심는다고 알린다", () => {
    expect(nextMsg(100)).toBe("내일 · 포도원에 2번째 나무를 심어요");
    expect(nextMsg(200)).toBe("내일 · 포도원에 3번째 나무를 심어요");
  });

  it("101일 이후에는 새 나무 기준으로 센다", () => {
    expect(nextMsg(101)).toBe("내일 · 흙을 뚫고 작은 싹이 올라와요");
  });
});

describe("sceneTrees", () => {
  it("100일까지는 한 그루", () => {
    expect(sceneTrees(1)).toEqual({ visible: [1], hidden: 0 });
    expect(sceneTrees(100)).toEqual({ visible: [100], hidden: 0 });
  });

  it("101일부터 다 자란 나무 옆에 새 나무", () => {
    expect(sceneTrees(101)).toEqual({ visible: [100, 1], hidden: 0 });
    expect(sceneTrees(250)).toEqual({ visible: [100, 100, 50], hidden: 0 });
  });

  it("정확히 100의 배수에서는 새 나무를 아직 심지 않는다", () => {
    expect(sceneTrees(200)).toEqual({ visible: [100, 100], hidden: 0 });
    expect(sceneTrees(300)).toEqual({ visible: [100, 100, 100], hidden: 0 });
  });

  it("3그루를 넘으면 최근 3그루만 그리고 나머지는 숫자로", () => {
    expect(sceneTrees(301)).toEqual({ visible: [100, 100, 1], hidden: 1 });
    expect(sceneTrees(1050)).toEqual({ visible: [100, 100, 50], hidden: 8 });
  });
});
