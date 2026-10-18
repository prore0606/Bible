import { describe, expect, it } from "vitest";
import {
  MISSED_YESTERDAY_BODY,
  NOTIFICATION_TITLE,
  WATER_BODY,
  notificationId,
  planNotifications,
  type NotifyInput,
} from "@/lib/notify";

const base: NotifyInput = {
  now: new Date(2026, 9, 18, 6, 0), // 2026-10-18 06:00 (일요일)
  alarm: { enabled: true, hour: 7, minute: 0 },
  todayDone: false,
  missedYesterday: false,
  completedDays: 10, // 이 알림의 미션을 마치면 12일째... 아래에서 이정표를 피한다
  firstRef: { book: "PSA", chapter: 23 },
};

describe("planNotifications", () => {
  it("알림이 꺼져 있으면 예약하지 않는다", () => {
    expect(planNotifications({ ...base, alarm: { ...base.alarm, enabled: false } })).toEqual([]);
  });

  it("앞으로 7일치를 하루 1개씩, 제목은 항상 성경-말씀숲", () => {
    const plan = planNotifications(base);
    expect(plan).toHaveLength(7);
    expect(plan.map((p) => p.date)).toEqual([
      "2026-10-18", "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24",
    ]);
    expect(new Set(plan.map((p) => p.title))).toEqual(new Set([NOTIFICATION_TITLE]));
  });

  it("울리는 시각은 고른 시간 (24시간제)", () => {
    const plan = planNotifications({ ...base, alarm: { enabled: true, hour: 21, minute: 30 } });
    expect(plan[0].at).toEqual(new Date(2026, 9, 18, 21, 30));
    expect(plan[6].at).toEqual(new Date(2026, 9, 24, 21, 30));
  });

  it("오늘 알림 시각이 이미 지났으면 내일부터", () => {
    const plan = planNotifications({ ...base, now: new Date(2026, 9, 18, 7, 0) }); // 정확히 알림 시각
    expect(plan[0].date).toBe("2026-10-19");
    expect(plan).toHaveLength(7);
  });

  it("오늘 미션을 마쳤으면 오늘 알림은 빼고 내일부터", () => {
    const plan = planNotifications({ ...base, todayDone: true });
    expect(plan[0].date).toBe("2026-10-19");
    expect(plan[6].date).toBe("2026-10-25");
  });

  it("알림 번호는 날짜마다 달라서 겹치지 않는다 (월·연 경계 포함)", () => {
    const plan = planNotifications({ ...base, now: new Date(2026, 11, 28, 6, 0) });
    expect(plan.map((p) => p.date)).toContain("2027-01-03");
    expect(new Set(plan.map((p) => p.id)).size).toBe(7);
    expect(notificationId("2026-10-18")).toBe(20261018);
    expect(plan.every((p) => p.id < 2 ** 31)).toBe(true);
  });

  it("자정을 막 넘긴 시각에도 오늘 날짜 기준으로 계획한다", () => {
    const plan = planNotifications({ ...base, now: new Date(2026, 9, 19, 0, 5) });
    expect(plan[0].date).toBe("2026-10-19");
  });

  describe("문구", () => {
    it("어제 놓친 날 오늘 알림은 죄책감 없는 문구", () => {
      const plan = planNotifications({ ...base, missedYesterday: true });
      expect(plan[0].body).toBe(MISSED_YESTERDAY_BODY);
      expect(plan[1].body).not.toBe(MISSED_YESTERDAY_BODY);
    });

    it("오늘 알림이 내일부터로 밀리면 어제 놓침 문구를 쓰지 않는다", () => {
      const plan = planNotifications({ ...base, now: new Date(2026, 9, 18, 8, 0), missedYesterday: true });
      expect(plan.every((p) => p.body !== MISSED_YESTERDAY_BODY)).toBe(true);
    });

    it("기본 문구는 두 가지를 날짜로 번갈아 쓴다", () => {
      const bodies = planNotifications(base).map((p) => p.body);
      expect(bodies.filter((b) => b === WATER_BODY).length).toBeGreaterThanOrEqual(3);
      expect(bodies.some((b) => b.startsWith("오늘의 1장이 기다리고 있어요 · "))).toBe(true);
      for (let i = 0; i < 6; i += 1) expect(bodies[i]).not.toBe(bodies[i + 1]);
    });

    it("같은 날의 문구는 다시 예약해도 바뀌지 않는다", () => {
      const a = planNotifications(base);
      const b = planNotifications({ ...base, now: new Date(2026, 9, 18, 6, 30) });
      expect(b.map((p) => p.body)).toEqual(a.map((p) => p.body));
    });

    it("책 이름과 장이 들어가고, 날짜가 지날수록 매일 읽는다고 보고 다음 장이 된다", () => {
      const withRef = planNotifications(base).filter((p) => p.body.includes("·"));
      expect(withRef[0].body).toBe(`오늘의 1장이 기다리고 있어요 · 시편 ${23 + (Number(withRef[0].date.slice(8)) - 18)}장`);
    });

    it("이 알림의 미션을 마치면 이정표에 닿는 날은 이정표 문구", () => {
      // 완료 6일 → 오늘 마치면 성장일 8... 꽃(30일)에 닿는 날: completedDays + 2 + index = 30
      const plan = planNotifications({ ...base, completedDays: 26 });
      expect(plan[2].body).toBe("오늘 1장을 읽으면 작은 포도꽃이 피어요 · 한 달 축하");
    });

    it("오늘 미션을 마친 경우 첫 알림(내일)의 이정표는 내일 미션 기준", () => {
      // 오늘 완료로 completedDays=28 → 내일 마치면 성장일 30 (꽃)
      const plan = planNotifications({ ...base, todayDone: true, completedDays: 28 });
      expect(plan[0].body).toBe("오늘 1장을 읽으면 작은 포도꽃이 피어요 · 한 달 축하");
    });

    it("이정표가 어제 놓침 문구보다 먼저는 아니다 (오늘 알림은 어제 놓침이 우선)", () => {
      const plan = planNotifications({ ...base, missedYesterday: true, completedDays: 28 });
      expect(plan[0].body).toBe(MISSED_YESTERDAY_BODY);
    });
  });
});
