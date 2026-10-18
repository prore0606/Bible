"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { appStore, useAppStore } from "@/app/store";
import { Mascot } from "@/components/art/Mascot";
import TimeWheel from "@/components/TimeWheel";
import { BottomBar, Button, Heading, Screen } from "@/components/ui";
import { QUICK_TIMES, formatTime, fromWheel, toWheel, type WheelTime } from "@/lib/time";

// 06 알림 시간 (2/2): 12시간제 휠로 고른 시간을 24시간제로 저장한다.
// 알림 권한 요청과 예약은 알림 기능(T12)에서 이어 붙인다.
export default function SetupAlarmPage() {
  const router = useRouter();
  const alarm = useAppStore((s) => s.settings?.alarm);
  const [time, setTime] = useState<WheelTime>(() => toWheel(alarm?.hour ?? 7, alarm?.minute ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const { hour, minute } = fromWheel(time);

  const finish = async (enabled: boolean) => {
    setSaving(true);
    setError(undefined);
    try {
      await appStore.getState().updateSettings({ alarm: { enabled, hour, minute } });
      router.push("/seed/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요. 다시 시도해 주세요.");
      setSaving(false);
    }
  };

  return (
    <Screen withBottomBar>
      <div className="text-[13px] font-extrabold text-grape">2 / 2</div>
      <div className="mt-1">
        <Heading size="md">
          매일 몇 시에
          <br />
          알려 드릴까요?
        </Heading>
      </div>

      <div className="mt-5">
        <TimeWheel value={time} onChange={setTime} />
      </div>

      <div className="mt-5 text-[14px] font-bold text-ink/70">자주 고르는 시간</div>
      <div className="mt-2 flex gap-2">
        {QUICK_TIMES.map((q) => {
          const on = q.hour === hour && q.minute === minute;
          return (
            <button
              key={q.label}
              type="button"
              aria-pressed={on}
              onClick={() => setTime(toWheel(q.hour, q.minute))}
              className={`flex-1 rounded-[12px] py-3 text-[14px] font-semibold shadow-card ${
                on ? "bg-blue text-white" : "bg-card text-ink"
              }`}
            >
              {q.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-[14px] bg-butter px-4 py-3" aria-live="polite">
        <Mascot size={30} />
        <div>
          <b className="block text-[15px]">매일 {formatTime(hour, minute)}</b>
          <span className="text-[13px] text-butter-text">&ldquo;오늘의 1장이 기다리고 있어요&rdquo;</span>
        </div>
      </div>

      <BottomBar className="bg-bg">
        {error && <p className="mb-2 text-center text-[13px] text-butter-text">{error}</p>}
        <Button onClick={() => finish(true)} disabled={saving}>
          이대로 시작할게요
        </Button>
        <Button variant="ghost" onClick={() => finish(false)} disabled={saving} className="mt-1">
          알림 없이 시작하기
        </Button>
      </BottomBar>
    </Screen>
  );
}
