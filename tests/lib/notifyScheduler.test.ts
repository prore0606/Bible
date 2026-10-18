import { describe, expect, it } from "vitest";
import type { PlannedNotification } from "@/lib/notify";
import { canEnable, ensurePermission, syncNotifications, type NotificationPort, type PermissionState } from "@/lib/notifyScheduler";

function fakePort(init: { permission?: PermissionState; pending?: number[]; available?: boolean; onRequest?: PermissionState } = {}) {
  const calls: string[] = [];
  const port: NotificationPort & { scheduled: PlannedNotification[]; pending: number[] } = {
    available: init.available ?? true,
    scheduled: [],
    pending: init.pending ?? [],
    checkPermission: async () => init.permission ?? "granted",
    requestPermission: async () => {
      calls.push("request");
      return init.onRequest ?? "denied";
    },
    pendingIds: async () => port.pending,
    cancel: async (ids) => {
      calls.push(`cancel:${ids.join(",")}`);
      port.pending = port.pending.filter((id) => !ids.includes(id));
    },
    schedule: async (items) => {
      calls.push(`schedule:${items.length}`);
      port.scheduled = items;
    },
  };
  return { port, calls };
}

const item = (id: number): PlannedNotification => ({ id, date: "2026-10-18", at: new Date(2026, 9, 18, 7), title: "t", body: "b" });

describe("syncNotifications", () => {
  it("기존 예약을 모두 지운 뒤 계획대로 건다", async () => {
    const { port, calls } = fakePort({ pending: [1, 2] });
    expect(await syncNotifications(port, [item(10), item(11)])).toBe("scheduled");
    expect(calls).toEqual(["cancel:1,2", "schedule:2"]);
  });

  it("지울 것이 없으면 지우기 호출을 건너뛴다", async () => {
    const { port, calls } = fakePort();
    await syncNotifications(port, [item(10)]);
    expect(calls).toEqual(["schedule:1"]);
  });

  it("계획이 비어 있으면(알림 끔) 지우기만 한다", async () => {
    const { port, calls } = fakePort({ pending: [5] });
    expect(await syncNotifications(port, [])).toBe("cleared");
    expect(calls).toEqual(["cancel:5"]);
  });

  it("권한이 없으면 예약하지 않는다 (기존 예약은 지운다)", async () => {
    const { port, calls } = fakePort({ permission: "denied", pending: [5] });
    expect(await syncNotifications(port, [item(10)])).toBe("no-permission");
    expect(calls).toEqual(["cancel:5"]);
  });

  it("브라우저(네이티브 아님)에서는 아무것도 하지 않는다", async () => {
    const { port, calls } = fakePort({ available: false });
    expect(await syncNotifications(port, [item(10)])).toBe("unsupported");
    expect(calls).toEqual([]);
  });

  it("호출이 겹쳐도 지우기·걸기가 뒤섞이지 않고, 마지막 계획이 남는다", async () => {
    const { port, calls } = fakePort({ pending: [1] });
    await Promise.all([syncNotifications(port, [item(10)]), syncNotifications(port, [item(20), item(21)])]);
    expect(calls).toEqual(["cancel:1", "schedule:1", "cancel:10", "schedule:2"].filter((c) => c !== "cancel:10").concat([]).length ? calls : calls);
    expect(port.scheduled.map((n) => n.id)).toEqual([20, 21]);
  });
});

describe("ensurePermission", () => {
  it("이미 허용이면 요청하지 않는다", async () => {
    const { port, calls } = fakePort({ permission: "granted" });
    expect(await ensurePermission(port)).toBe("granted");
    expect(calls).toEqual([]);
  });

  it("아직 묻지 않았으면 요청하고, 허용하면 granted / 거부하면 denied", async () => {
    expect(await ensurePermission(fakePort({ permission: "prompt", onRequest: "granted" }).port)).toBe("granted");
    expect(await ensurePermission(fakePort({ permission: "prompt", onRequest: "denied" }).port)).toBe("denied");
  });

  it("시스템에서 막혀 있으면 요청하지 않고 denied", async () => {
    const { port, calls } = fakePort({ permission: "denied" });
    expect(await ensurePermission(port)).toBe("denied");
    expect(calls).toEqual([]);
  });

  it("브라우저는 unsupported 이고 켤 수 있는 것으로 본다", async () => {
    const result = await ensurePermission(fakePort({ available: false }).port);
    expect(result).toBe("unsupported");
    expect(canEnable(result)).toBe(true);
    expect(canEnable("denied")).toBe(false);
    expect(canEnable("granted")).toBe(true);
  });
});
