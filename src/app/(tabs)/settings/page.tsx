"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { appStore, useAppStore } from "@/app/store";
import { showToast } from "@/app/toast";
import type { Ref, Settings } from "@/app/types";
import BookPicker from "@/components/BookPicker";
import BottomSheet, { SheetFooter } from "@/components/BottomSheet";
import { CONCEPT_SENTENCE } from "@/components/SplashView";
import TimeWheel from "@/components/TimeWheel";
import { Button, Screen } from "@/components/ui";
import { PRIVACY_POLICY_URL } from "@/data/links";
import { FONT_LABELS, FONT_PX, toggleLang, type FontSize } from "@/lib/reading";
import { formatRef } from "@/lib/ref";
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
import type { SettingsPatch } from "@/lib/storage";
import { THEMES, THEME_LABELS, type Theme } from "@/lib/theme";
import { QUICK_TIMES, formatTime, fromWheel, toWheel, type WheelTime } from "@/lib/time";

type SheetKind = "time" | "place" | "lang" | "font" | "theme";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";
const SAMPLE_VERSE = "태초에 하나님이 천지를 창조하시니라";

// 15 설정 (docs/spec.md 5장): 알림, 읽는 곳, 성경 언어, 글자 크기, 화면 테마, 앱 정보
export default function SettingsPage() {
  const router = useRouter();
  const settings = useAppStore((s) => s.settings);
  const todayLog = useAppStore((s) => s.todayLog);
  const [sheet, setSheet] = useState<SheetKind | null>(null);

  if (!settings) return null;

  const update = (patch: SettingsPatch) =>
    appStore
      .getState()
      .updateSettings(patch)
      .catch(() => showToast("저장하지 못했어요. 다시 시도해 주세요"));
  const close = () => setSheet(null);

  return (
    <Screen withTabBar>
      <header className="flex items-center pb-3">
        <button
          type="button"
          onClick={() => router.replace("/home/")}
          className="flex items-center gap-1.5 text-[18px] font-bold"
        >
          <span aria-hidden="true">‹</span>설정
        </button>
      </header>

      <section className="rounded-card bg-card px-4 shadow-card" aria-label="알림과 읽는 곳">
        <div className="flex items-center justify-between py-3.5 text-[15px] font-semibold">
          <span id="alarm-label">매일 알림</span>
          <Switch
            checked={settings.alarm.enabled}
            labelledBy="alarm-label"
            onChange={() => update({ alarm: { ...settings.alarm, enabled: !settings.alarm.enabled } })}
          />
        </div>
        <Row label="알림 시간" value={alarmTimeLabel(settings.alarm)} onClick={() => setSheet("time")} divider />
        <Row label="읽는 곳 바꾸기" value={readingPlaceLabel(settings)} onClick={() => setSheet("place")} divider />
      </section>

      <section className="mt-2 rounded-card bg-card px-4 shadow-card" aria-label="보기 설정">
        <Row label="성경 언어" value={langLabel(settings.langs)} onClick={() => setSheet("lang")} />
        <Row label="글자 크기" value={FONT_LABELS[settings.fontSize]} onClick={() => setSheet("font")} divider />
        <Row label="화면 테마" value={THEME_LABELS[settings.theme]} onClick={() => setSheet("theme")} divider />
      </section>

      <section className="mt-6 text-center" aria-label="앱 정보">
        <b className="block text-[14px]">{CONCEPT_SENTENCE}</b>
        <span className="mt-0.5 block text-[12px] text-gray-text">
          요한복음 15:5 · 성경-말씀숲{APP_VERSION && ` v${APP_VERSION}`}
        </span>
        <p className="mt-3 text-[11px] leading-[1.7] text-gray-text">
          {BIBLE_CREDIT}
          <br />
          {VERSE_NUMBER_NOTE}
          <br />
          {FONT_CREDIT}
        </p>
        {PRIVACY_POLICY_URL && (
          <a
            href={PRIVACY_POLICY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-[12px] font-semibold text-blue-text underline"
          >
            개인정보처리방침
          </a>
        )}
      </section>

      {sheet === "time" && <TimeSheet alarm={settings.alarm} onSave={update} onClose={close} />}
      {sheet === "place" && <PlaceSheet settings={settings} todayStarted={!!todayLog} onSave={update} onClose={close} />}
      {sheet === "lang" && <LangSheet langs={settings.langs} onSave={update} onClose={close} />}
      {sheet === "font" && <FontSheet fontSize={settings.fontSize} onSave={update} onClose={close} />}
      {sheet === "theme" && <ThemeSheet theme={settings.theme} onSave={update} onClose={close} />}
    </Screen>
  );
}

function Row({ label, value, onClick, divider = false }: { label: string; value: string; onClick: () => void; divider?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between py-3.5 text-left text-[15px] font-semibold ${divider ? "border-t border-line" : ""}`}
    >
      <span>{label}</span>
      <span className="text-[13px] font-medium text-gray-text">{value} ›</span>
    </button>
  );
}

function Switch({ checked, onChange, labelledBy }: { checked: boolean; onChange: () => void; labelledBy: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={onChange}
      className={`relative h-[26px] w-[46px] rounded-full transition-colors ${checked ? "bg-blue" : "bg-gray/40"}`}
    >
      <span
        className={`absolute top-[3px] h-5 w-5 rounded-full bg-card shadow transition-all ${checked ? "left-[23px]" : "left-[3px]"}`}
      />
    </button>
  );
}

function SheetTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="pr-8 text-[18px] font-extrabold tracking-[-0.3px]">{children}</h2>;
}

/** 라디오/체크 한 줄 선택지 */
function Option({
  role,
  checked,
  onClick,
  title,
  children,
}: {
  role: "radio" | "checkbox";
  checked: boolean;
  onClick: () => void;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={checked}
      onClick={onClick}
      className={`mt-2 flex w-full items-center justify-between rounded-[14px] border-[1.5px] px-4 py-3.5 text-left ${
        checked ? "border-blue bg-blue-tint" : "border-transparent bg-bg"
      }`}
    >
      <span>
        <span className="block text-[15px] font-bold">{title}</span>
        {children}
      </span>
      <span
        aria-hidden="true"
        className={`h-[18px] w-[18px] shrink-0 rounded-full border-2 ${role === "checkbox" ? "rounded-[5px]" : ""} ${
          checked ? "border-blue bg-blue" : "border-gray/50"
        }`}
      />
    </button>
  );
}

function TimeSheet({ alarm, onSave, onClose }: { alarm: Settings["alarm"]; onSave: (p: SettingsPatch) => void; onClose: () => void }) {
  const [time, setTime] = useState<WheelTime>(() => toWheel(alarm.hour, alarm.minute));
  const { hour, minute } = fromWheel(time);
  return (
    <BottomSheet label="알림 시간" onClose={onClose}>
      <SheetTitle>알림 시간</SheetTitle>
      <div className="mt-4">
        <TimeWheel value={time} onChange={setTime} />
      </div>
      <div className="mt-3 flex gap-2">
        {QUICK_TIMES.map((q) => (
          <button
            key={q.label}
            type="button"
            aria-pressed={q.hour === hour && q.minute === minute}
            onClick={() => setTime(toWheel(q.hour, q.minute))}
            className={`flex-1 rounded-[12px] py-2.5 text-[13px] font-semibold ${
              q.hour === hour && q.minute === minute ? "bg-blue text-on-blue" : "bg-bg"
            }`}
          >
            {q.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-[13px] text-gray-text" aria-live="polite">
        매일 {formatTime(hour, minute)}에 알려 드려요
      </p>
      <SheetFooter>
        <Button
          onClick={() => {
            onSave({ alarm: { ...alarm, hour, minute } });
            onClose();
          }}
        >
          저장
        </Button>
      </SheetFooter>
    </BottomSheet>
  );
}

function PlaceSheet({
  settings,
  todayStarted,
  onSave,
  onClose,
}: {
  settings: Settings;
  todayStarted: boolean;
  onSave: (p: SettingsPatch) => void;
  onClose: () => void;
}) {
  const [chosen, setChosen] = useState<Ref>(settings.pendingNext ?? settings.next);
  return (
    <BottomSheet label="읽는 곳 바꾸기" onClose={onClose}>
      <SheetTitle>어디서부터 읽을까요?</SheetTitle>
      <div className="mt-4">
        <BookPicker value={chosen} onChange={setChosen} />
      </div>
      <p className="mt-3 rounded-[10px] bg-butter px-3 py-2 text-[13px] leading-[1.5] text-butter-text">
        {applyNote(todayStarted)}
      </p>
      <SheetFooter>
        <Button
          onClick={() => {
            onSave({ pendingNext: pendingFor(chosen, settings.next) });
            showToast(`읽는 곳을 바꿨어요 · ${formatRef(chosen)}`); // 조사(로/으로)가 책 이름에 따라 달라지므로 쓰지 않는다
            onClose();
          }}
        >
          {formatRef(chosen)}부터 읽을게요
        </Button>
      </SheetFooter>
    </BottomSheet>
  );
}

function LangSheet({ langs, onSave, onClose }: { langs: Settings["langs"]; onSave: (p: SettingsPatch) => void; onClose: () => void }) {
  const change = (lang: keyof Settings["langs"]) => {
    const next = toggleLang(langs, lang);
    if (next === langs) {
      showToast("한 가지 언어는 켜져 있어야 해요");
      return;
    }
    onSave({ langs: next });
  };
  return (
    <BottomSheet label="성경 언어" onClose={onClose}>
      <SheetTitle>성경 언어</SheetTitle>
      <p className="mt-1 text-[13px] text-gray-text">둘 다 켜면 한 절씩 나란히 보여요</p>
      <Option role="checkbox" checked={langs.ko} onClick={() => change("ko")} title="한국어">
        <span className="text-[12px] text-gray-text">개역한글</span>
      </Option>
      <Option role="checkbox" checked={langs.en} onClick={() => change("en")} title="English">
        <span className="text-[12px] text-gray-text">King James Version</span>
      </Option>
      <div className="mt-4">
        <Button variant="ghost" onClick={onClose}>
          닫기
        </Button>
      </div>
    </BottomSheet>
  );
}

function FontSheet({ fontSize, onSave, onClose }: { fontSize: FontSize; onSave: (p: SettingsPatch) => void; onClose: () => void }) {
  return (
    <BottomSheet label="글자 크기" onClose={onClose}>
      <SheetTitle>글자 크기</SheetTitle>
      {(["s", "m", "l", "xl"] as const).map((size) => (
        <Option key={size} role="radio" checked={fontSize === size} onClick={() => onSave({ fontSize: size })} title={`${FONT_LABELS[size]} · ${FONT_PX[size]}`}>
          <span className="mt-1 block font-bible leading-[1.6]" style={{ fontSize: FONT_PX[size] }}>
            {SAMPLE_VERSE}
          </span>
        </Option>
      ))}
      <div className="mt-4">
        <Button variant="ghost" onClick={onClose}>
          닫기
        </Button>
      </div>
    </BottomSheet>
  );
}

function ThemeSheet({ theme, onSave, onClose }: { theme: Theme; onSave: (p: SettingsPatch) => void; onClose: () => void }) {
  return (
    <BottomSheet label="화면 테마" onClose={onClose}>
      <SheetTitle>화면 테마</SheetTitle>
      {THEMES.map((t) => (
        <Option key={t} role="radio" checked={theme === t} onClick={() => onSave({ theme: t })} title={THEME_LABELS[t]}>
          {t === "system" && <span className="text-[12px] text-gray-text">기기의 밝기 설정을 따라요</span>}
        </Option>
      ))}
      <div className="mt-4">
        <Button variant="ghost" onClick={onClose}>
          닫기
        </Button>
      </div>
    </BottomSheet>
  );
}
