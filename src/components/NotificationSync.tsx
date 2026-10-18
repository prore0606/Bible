"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { appStore, selectHomeSummary, useAppStore } from "@/app/store";
import { todayRef, tomorrowRef } from "@/lib/home";
import { missionStatus } from "@/lib/mission";
import { planNotifications } from "@/lib/notify";
import { getNotificationPort, syncNotifications } from "@/lib/notifyScheduler";

/** 지금 저장소 상태로 7일치 알림을 다시 건다 (앱을 열 때·미션을 마칠 때·알림 설정을 바꿀 때·앱이 다시 열릴 때) */
async function resync(): Promise<void> {
  const state = appStore.getState();
  if (state.status !== "ready" || !state.settings || !state.stats) return;
  const { settings, todayLog, stats } = state;
  const todayDone = missionStatus(todayLog) === "done";
  const plan = planNotifications({
    now: new Date(),
    alarm: settings.alarm,
    todayDone,
    missedYesterday: selectHomeSummary(state).missedYesterday,
    completedDays: stats.completedDays,
    firstRef: todayDone ? tomorrowRef(settings) : todayRef(settings, todayLog),
  });
  await syncNotifications(await getNotificationPort(), plan);
}

/**
 * 알림 계획을 기기에 거는 곳. 앱(네이티브)에서만 실제로 동작하고, 브라우저에서는 아무 일도 하지 않는다.
 * 알림을 누르면 앱이 열리며 홈으로 간다.
 */
export default function NotificationSync() {
  const router = useRouter();
  const ready = useAppStore((s) => s.status === "ready");
  const alarm = useAppStore((s) => s.settings?.alarm);
  const next = useAppStore((s) => s.settings?.next);
  const pendingNext = useAppStore((s) => s.settings?.pendingNext);
  const today = useAppStore((s) => s.today);
  const todayLog = useAppStore((s) => s.todayLog);
  const completedDays = useAppStore((s) => s.stats?.completedDays);
  const logCount = useAppStore((s) => s.logs.length);
  const revivedCount = useAppStore((s) => s.revivedAts.length);

  // 알림에 영향을 주는 값이 바뀔 때마다 다시 건다
  const completedAt = todayLog?.completedAt;
  useEffect(() => {
    if (ready) void resync().catch(() => undefined);
  }, [ready, alarm?.enabled, alarm?.hour, alarm?.minute, next?.book, next?.chapter, pendingNext?.book, pendingNext?.chapter, today, completedAt, completedDays, logCount, revivedCount]);

  useEffect(() => {
    let cancelled = false;
    let remove: (() => void) | undefined;
    void (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform() || cancelled) return;
      const [{ LocalNotifications }, { App }] = await Promise.all([
        import("@capacitor/local-notifications"),
        import("@capacitor/app"),
      ]);
      const tap = await LocalNotifications.addListener("localNotificationActionPerformed", () => router.replace("/home/"));
      // 며칠 만에 앱이 다시 열리면 날짜가 바뀌었을 수 있다 (store.refresh 는 NativeShell 이 부른다)
      const resume = await App.addListener("resume", () => void resync().catch(() => undefined));
      remove = () => {
        void tap.remove();
        void resume.remove();
      };
      if (cancelled) remove();
    })();
    return () => {
      cancelled = true;
      remove?.();
    };
  }, [router]);

  return null;
}
