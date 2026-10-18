// 알림 예약 (docs/spec.md 8장). 계획(notify.ts)을 기기에 실제로 걸어 두는 일.
// 플러그인은 NotificationPort 뒤에 숨겨서, 같은 코드를 테스트에서는 가짜 포트로 돌린다.
import type { PlannedNotification } from "@/lib/notify";

export type PermissionState = "granted" | "denied" | "prompt";

export interface NotificationPort {
  /** 앱(네이티브)에서만 true. 브라우저에서는 알림을 걸 수 없다. */
  available: boolean;
  checkPermission(): Promise<PermissionState>;
  requestPermission(): Promise<PermissionState>;
  pendingIds(): Promise<number[]>;
  cancel(ids: number[]): Promise<void>;
  schedule(items: PlannedNotification[]): Promise<void>;
}

export type SyncResult = "scheduled" | "cleared" | "no-permission" | "unsupported";

export const PERMISSION_BLOCKED_HINT = "알림이 막혀 있어요. 휴대폰 설정 > 앱 > 성경-말씀숲 > 알림에서 켜 주세요";

/**
 * 기존 예약을 모두 지우고 계획대로 다시 건다. 계획이 비어 있거나 권한이 없으면 지우기만 한다.
 * 호출이 겹치면 지우기와 걸기가 뒤섞이지 않게 한 줄로 처리한다.
 */
let queue: Promise<unknown> = Promise.resolve();
export function syncNotifications(port: NotificationPort, plan: readonly PlannedNotification[]): Promise<SyncResult> {
  const run = queue.then(() => doSync(port, plan));
  queue = run.catch(() => undefined);
  return run;
}

async function doSync(port: NotificationPort, plan: readonly PlannedNotification[]): Promise<SyncResult> {
  if (!port.available) return "unsupported";
  const pending = await port.pendingIds();
  if (pending.length > 0) await port.cancel(pending);
  if (plan.length === 0) return "cleared";
  if ((await port.checkPermission()) !== "granted") return "no-permission";
  await port.schedule([...plan]);
  return "scheduled";
}

/**
 * 알림을 켜기 전에 권한을 확인하고, 필요하면 한 번 요청한다.
 * "unsupported"(브라우저)는 막히지 않은 것으로 다룬다 — 개발 중에도 설정이 같은 흐름으로 동작하게.
 */
export async function ensurePermission(port: NotificationPort): Promise<"granted" | "denied" | "unsupported"> {
  if (!port.available) return "unsupported";
  const state = await port.checkPermission();
  if (state === "granted") return "granted";
  if (state === "denied") return "denied"; // 시스템에서 이미 막힘: 요청해도 창이 뜨지 않을 수 있다
  return (await port.requestPermission()) === "granted" ? "granted" : "denied";
}

/** 권한 결과로 알림을 켤 수 있는지 */
export const canEnable = (result: "granted" | "denied" | "unsupported"): boolean => result !== "denied";

/** 앱에서는 @capacitor/local-notifications, 브라우저에서는 아무것도 하지 않는 포트 */
export async function createNotificationPort(): Promise<NotificationPort> {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return NO_PORT;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const state = (s: string): PermissionState => (s === "granted" ? "granted" : s === "denied" ? "denied" : "prompt");
  return {
    available: true,
    checkPermission: async () => state((await LocalNotifications.checkPermissions()).display),
    requestPermission: async () => state((await LocalNotifications.requestPermissions()).display),
    pendingIds: async () => (await LocalNotifications.getPending()).notifications.map((n) => n.id),
    cancel: async (ids) => void (await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) })),
    schedule: async (items) => {
      await LocalNotifications.schedule({
        notifications: items.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          // 정확한 시각의 알람(별도 권한·설정 화면 이동)은 쓰지 않는다. 몇 분 늦을 수 있다.
          schedule: { at: n.at, allowWhileIdle: true },
          isExactNotification: false,
        })),
      });
    },
  };
}

const NO_PORT: NotificationPort = {
  available: false,
  checkPermission: async () => "denied",
  requestPermission: async () => "denied",
  pendingIds: async () => [],
  cancel: async () => undefined,
  schedule: async () => undefined,
};

let sharedPort: Promise<NotificationPort> | undefined;
/** 앱 전체에서 같은 포트를 쓴다 (플러그인을 한 번만 불러온다) */
export function getNotificationPort(): Promise<NotificationPort> {
  sharedPort ??= createNotificationPort();
  return sharedPort;
}
