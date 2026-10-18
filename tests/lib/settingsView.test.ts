import { describe, expect, it } from "vitest";
import {
  BIBLE_CREDIT,
  FONT_CREDIT,
  VERSE_NUMBER_NOTE,
  alarmTimeLabel,
  applyNote,
  langLabel,
  pendingFor,
  readingPlaceLabel,
} from "@/lib/settingsView";

const GEN13 = { book: "GEN", chapter: 13 } as const;
const PSA23 = { book: "PSA", chapter: 23 } as const;

describe("pendingFor (읽는 곳 바꾸기)", () => {
  it("다른 곳을 고르면 그곳을 대기시킨다", () => {
    expect(pendingFor(PSA23, GEN13)).toEqual(PSA23);
  });

  it("지금 다음 장으로 잡혀 있는 곳을 고르면 바꿀 것이 없어 null (대기 중인 변경을 지움)", () => {
    expect(pendingFor(GEN13, GEN13)).toBeNull();
    expect(pendingFor({ book: "GEN", chapter: 13 }, GEN13)).toBeNull();
  });

  it("같은 책의 다른 장은 바뀐 것이다", () => {
    expect(pendingFor({ book: "GEN", chapter: 14 }, GEN13)).toEqual({ book: "GEN", chapter: 14 });
  });
});

describe("readingPlaceLabel", () => {
  it("바꿔 둔 곳이 있으면 그곳, 없으면 다음 장", () => {
    expect(readingPlaceLabel({ next: GEN13 })).toBe("창세기 13장");
    expect(readingPlaceLabel({ next: GEN13, pendingNext: PSA23 })).toBe("시편 23장");
  });
});

describe("applyNote", () => {
  it("오늘 시작 전이면 오늘부터, 이미 시작했으면 내일부터", () => {
    expect(applyNote(false)).toBe("바꾼 곳부터 오늘의 미션을 시작해요.");
    expect(applyNote(true)).toContain("내일 미션부터");
  });
});

describe("alarmTimeLabel · langLabel", () => {
  it("알림 시간", () => {
    expect(alarmTimeLabel({ enabled: true, hour: 7, minute: 0 })).toBe("오전 7:00");
    expect(alarmTimeLabel({ enabled: false, hour: 21, minute: 30 })).toBe("오후 9:30");
  });

  it("언어", () => {
    expect(langLabel({ ko: true, en: false })).toBe("한국어");
    expect(langLabel({ ko: false, en: true })).toBe("English");
    expect(langLabel({ ko: true, en: true })).toBe("한국어 · English");
  });
});

describe("앱 정보 표기 (docs/bible-data.md, 대한성서공회 요구 표기)", () => {
  it("본문 출처·절 번호 안내·글꼴 표기", () => {
    expect(BIBLE_CREDIT).toContain("성경전서 개역한글판 (대한성서공회)");
    expect(BIBLE_CREDIT).toContain("King James Version (Public Domain)");
    expect(VERSE_NUMBER_NOTE).toContain("KJV");
    expect(FONT_CREDIT).toContain("Pretendard");
    expect(FONT_CREDIT).toContain("나눔명조");
    expect(FONT_CREDIT).toContain("SIL Open Font License");
  });
});
