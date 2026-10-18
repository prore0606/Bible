import { describe, expect, it } from "vitest";
import type { DayLog, Progress, Ref } from "@/app/types";
import {
  MissionError,
  PRAYER_MAX_LENGTH,
  canComplete,
  completeMission,
  isValidRef,
  markRead,
  missionStatus,
  nextRef,
  normalizePrayer,
  prevRef,
  startMission,
} from "@/lib/mission";

const TODAY = "2026-10-18";
const T_READ = "2026-10-18T01:00:00.000Z";
const T_DONE = "2026-10-18T01:05:00.000Z";
const GEN1: Ref = { book: "GEN", chapter: 1 };

const fresh = (ref: Ref = GEN1): DayLog => ({ date: TODAY, ref, revived: false });
const read = (ref?: Ref): DayLog => markRead(fresh(ref), T_READ);

describe("nextRef (다음 장 이동)", () => {
  it("같은 책의 다음 장", () => {
    expect(nextRef({ book: "GEN", chapter: 1 })).toEqual({ book: "GEN", chapter: 2 });
    expect(nextRef({ book: "PSA", chapter: 23 })).toEqual({ book: "PSA", chapter: 24 });
  });

  it("책의 마지막 장이면 다음 책 1장", () => {
    expect(nextRef({ book: "GEN", chapter: 50 })).toEqual({ book: "EXO", chapter: 1 });
    expect(nextRef({ book: "PSA", chapter: 150 })).toEqual({ book: "PRO", chapter: 1 });
  });

  it("구약 끝 → 신약 처음", () => {
    expect(nextRef({ book: "MAL", chapter: 4 })).toEqual({ book: "MAT", chapter: 1 });
  });

  it("1장짜리 책은 곧바로 다음 책", () => {
    expect(nextRef({ book: "OBA", chapter: 1 })).toEqual({ book: "JON", chapter: 1 });
    expect(nextRef({ book: "JUD", chapter: 1 })).toEqual({ book: "REV", chapter: 1 });
  });

  it("요한계시록 22장 다음은 창세기 1장", () => {
    expect(nextRef({ book: "REV", chapter: 22 })).toEqual({ book: "GEN", chapter: 1 });
  });

  it("1,189번 넘기면 한 바퀴를 돌아 제자리로 온다", () => {
    let ref: Ref = GEN1;
    for (let i = 0; i < 1189; i += 1) ref = nextRef(ref);
    expect(ref).toEqual(GEN1);
  });
});

describe("prevRef (이전 장)", () => {
  it("같은 책의 이전 장", () => {
    expect(prevRef({ book: "GEN", chapter: 2 })).toEqual(GEN1);
    expect(prevRef({ book: "PSA", chapter: 24 })).toEqual({ book: "PSA", chapter: 23 });
  });

  it("책의 첫 장이면 이전 책의 마지막 장", () => {
    expect(prevRef({ book: "EXO", chapter: 1 })).toEqual({ book: "GEN", chapter: 50 });
    expect(prevRef({ book: "PRO", chapter: 1 })).toEqual({ book: "PSA", chapter: 150 });
    expect(prevRef({ book: "MAT", chapter: 1 })).toEqual({ book: "MAL", chapter: 4 });
    expect(prevRef({ book: "JON", chapter: 1 })).toEqual({ book: "OBA", chapter: 1 });
  });

  it("창세기 1장 이전은 요한계시록 22장", () => {
    expect(prevRef(GEN1)).toEqual({ book: "REV", chapter: 22 });
  });

  it("nextRef 와 서로 되돌려진다 (1,189장 전부)", () => {
    let ref: Ref = GEN1;
    for (let i = 0; i < 1189; i += 1) {
      const next = nextRef(ref);
      expect(prevRef(next)).toEqual(ref);
      ref = next;
    }
  });
});

describe("isValidRef", () => {
  it("장 범위를 확인한다", () => {
    expect(isValidRef({ book: "PSA", chapter: 150 })).toBe(true);
    expect(isValidRef({ book: "PSA", chapter: 151 })).toBe(false);
    expect(isValidRef({ book: "GEN", chapter: 0 })).toBe(false);
    expect(isValidRef({ book: "GEN", chapter: 1.5 })).toBe(false);
  });
});

describe("startMission", () => {
  const progress: Progress = { next: GEN1 };

  it("오늘 로그가 없으면 진도의 장으로 만든다", () => {
    const { log } = startMission(TODAY, progress, undefined);
    expect(log).toEqual({ date: TODAY, ref: GEN1, revived: false });
  });

  it("시작할 장을 시편 23편으로 골랐으면 첫 미션이 시편 23편", () => {
    const { log } = startMission(TODAY, { next: { book: "PSA", chapter: 23 } }, undefined);
    expect(log.ref).toEqual({ book: "PSA", chapter: 23 });
  });

  it("오늘 로그가 이미 있으면 그대로 돌려주고 진도도 건드리지 않는다", () => {
    const existing = read();
    const withPending: Progress = { next: GEN1, pendingNext: { book: "JHN", chapter: 3 } };
    const result = startMission(TODAY, withPending, existing);
    expect(result.log).toBe(existing);
    expect(result.progress).toEqual(withPending); // 오늘은 이미 시작했으니 내일부터 적용
  });

  it("바꿔 둔 읽는 곳(pendingNext)은 새 로그를 만들 때 반영되고 지워진다", () => {
    const { log, progress: after } = startMission(
      TODAY,
      { next: GEN1, pendingNext: { book: "JHN", chapter: 3 } },
      undefined,
    );
    expect(log.ref).toEqual({ book: "JHN", chapter: 3 });
    expect(after).toEqual({ next: { book: "JHN", chapter: 3 } });
    expect(after.pendingNext).toBeUndefined();
  });
});

describe("markRead", () => {
  it("읽은 시각을 기록한다", () => {
    expect(read().readAt).toBe(T_READ);
  });

  it("두 번 눌러도 처음 시각을 유지한다", () => {
    const again = markRead(read(), "2026-10-18T02:00:00.000Z");
    expect(again.readAt).toBe(T_READ);
  });

  it("원본 로그를 바꾸지 않는다", () => {
    const original = fresh();
    markRead(original, T_READ);
    expect(original.readAt).toBeUndefined();
  });
});

describe("normalizePrayer (공백 제외 1~100자)", () => {
  it("앞뒤 공백을 지운다", () => {
    expect(normalizePrayer("  감사합니다  ")).toBe("감사합니다");
  });

  it("공백뿐이거나 비었으면 null", () => {
    expect(normalizePrayer("")).toBeNull();
    expect(normalizePrayer("     ")).toBeNull();
    expect(normalizePrayer("\n\t ")).toBeNull();
  });

  it("1자는 통과, 100자는 통과, 101자는 거부", () => {
    expect(normalizePrayer("아")).toBe("아");
    expect(normalizePrayer("가".repeat(PRAYER_MAX_LENGTH))).not.toBeNull();
    expect(normalizePrayer("가".repeat(PRAYER_MAX_LENGTH + 1))).toBeNull();
  });

  it("이모지는 DB(SQLite length)처럼 한 글자로 센다", () => {
    const hundredEmoji = "🙏".repeat(100); // JS length는 200
    expect(normalizePrayer(hundredEmoji)).toBe(hundredEmoji);
    expect(normalizePrayer("🙏".repeat(101))).toBeNull();
  });

  it("글자 사이 공백은 유지한다", () => {
    expect(normalizePrayer(" 주님 감사해요 ")).toBe("주님 감사해요");
  });
});

describe("completeMission", () => {
  const progress: Progress = { next: GEN1 };

  it("읽기와 기도가 있으면 완료되고, 다음 미션 장이 다음 장으로 옮겨진다", () => {
    const { log, progress: after } = completeMission(read(), "감사합니다", undefined, T_DONE, progress);
    expect(log.prayer).toBe("감사합니다");
    expect(log.completedAt).toBe(T_DONE);
    expect(after.next).toEqual({ book: "GEN", chapter: 2 });
  });

  it("연결한 구절을 함께 기록한다", () => {
    const { log } = completeMission(read(), "빛이 있게 하소서", "GEN.1.3", T_DONE, progress);
    expect(log.linkedVerseId).toBe("GEN.1.3");
  });

  it("기도를 다듬어서 저장한다", () => {
    const { log } = completeMission(read(), "  기도합니다 \n", undefined, T_DONE, progress);
    expect(log.prayer).toBe("기도합니다");
  });

  it("읽기 전에는 완료할 수 없다", () => {
    expect(() => completeMission(fresh(), "기도", undefined, T_DONE, progress)).toThrow(MissionError);
    try {
      completeMission(fresh(), "기도", undefined, T_DONE, progress);
    } catch (e) {
      expect((e as MissionError).code).toBe("NOT_READ");
    }
  });

  it("기도가 비었거나 101자면 완료할 수 없다", () => {
    for (const bad of ["", "   ", "가".repeat(101)]) {
      try {
        completeMission(read(), bad, undefined, T_DONE, progress);
        throw new Error("예외가 나야 한다");
      } catch (e) {
        expect(e).toBeInstanceOf(MissionError);
        expect((e as MissionError).code).toBe("INVALID_PRAYER");
      }
    }
  });

  it("같은 로그로 두 번 완료할 수 없다 (하루 미션 1번)", () => {
    const { log } = completeMission(read(), "기도", undefined, T_DONE, progress);
    try {
      completeMission(log, "또 기도", undefined, T_DONE, progress);
      throw new Error("예외가 나야 한다");
    } catch (e) {
      expect((e as MissionError).code).toBe("ALREADY_COMPLETED");
    }
  });

  it("23:50에 시작해 00:10에 완료해도 전날 미션으로 기록된다", () => {
    const startedAt = new Date(2026, 9, 18, 23, 50);
    const finishedAt = new Date(2026, 9, 19, 0, 10);
    const reading = markRead(fresh(), startedAt.toISOString());
    const { log } = completeMission(reading, "기도", undefined, finishedAt.toISOString(), progress);
    expect(log.date).toBe("2026-10-18");
    expect(log.completedAt).toBe(finishedAt.toISOString());
  });

  it("요한계시록 22장을 완료하면 다음 미션은 창세기 1장", () => {
    const rev22: Ref = { book: "REV", chapter: 22 };
    const { progress: after } = completeMission(read(rev22), "기도", undefined, T_DONE, { next: rev22 });
    expect(after.next).toEqual(GEN1);
  });

  it("책의 마지막 장을 완료하면 다음 책 1장", () => {
    const gen50: Ref = { book: "GEN", chapter: 50 };
    const { progress: after } = completeMission(read(gen50), "기도", undefined, T_DONE, { next: gen50 });
    expect(after.next).toEqual({ book: "EXO", chapter: 1 });
  });

  it("아직 적용 전인 pendingNext는 완료 후에도 남아 내일 미션에 쓰인다", () => {
    const pending: Ref = { book: "JHN", chapter: 3 };
    const { progress: after } = completeMission(read(), "기도", undefined, T_DONE, {
      next: GEN1,
      pendingNext: pending,
    });
    expect(after.pendingNext).toEqual(pending);
    const tomorrow = startMission("2026-10-19", after, undefined);
    expect(tomorrow.log.ref).toEqual(pending);
  });

  it("원본 로그와 진도를 바꾸지 않는다", () => {
    const original = read();
    const before: Progress = { next: GEN1 };
    completeMission(original, "기도", undefined, T_DONE, before);
    expect(original.completedAt).toBeUndefined();
    expect(before.next).toEqual(GEN1);
  });
});

describe("canComplete · missionStatus (홈의 미션 상태 3가지)", () => {
  it("버튼 활성 조건: 읽었고, 기도가 유효하고, 아직 완료 전", () => {
    expect(canComplete(fresh(), "기도")).toBe(false);
    expect(canComplete(read(), "")).toBe(false);
    expect(canComplete(read(), "기도")).toBe(true);
    const { log } = completeMission(read(), "기도", undefined, T_DONE, { next: GEN1 });
    expect(canComplete(log, "기도")).toBe(false);
  });

  it("시작 전 → 읽기 완료 → 미션 완료", () => {
    expect(missionStatus(undefined)).toBe("before");
    expect(missionStatus(fresh())).toBe("before"); // /read에 들어와 로그만 만든 상태
    expect(missionStatus(read())).toBe("read");
    const { log } = completeMission(read(), "기도", undefined, T_DONE, { next: GEN1 });
    expect(missionStatus(log)).toBe("done");
  });

  it("어제 읽기만 하고 못 끝낸 로그는 오늘 로그가 아니므로 오늘 상태는 '시작 전'", () => {
    // 오늘 로그가 없으면(undefined) 어제 미완료 로그와 무관하게 새로 시작한다
    const yesterdayUnfinished: DayLog = { ...read(), date: "2026-10-17" };
    expect(missionStatus(undefined)).toBe("before");
    const { log } = startMission(TODAY, { next: yesterdayUnfinished.ref }, undefined);
    expect(log.date).toBe(TODAY);
    expect(log.ref).toEqual(yesterdayUnfinished.ref); // 같은 장을 다시 읽는다
  });
});
