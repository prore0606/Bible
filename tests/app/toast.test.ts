import { beforeEach, describe, expect, it } from "vitest";
import { TOAST_ACTION_MS, TOAST_MS, showToast, toastStore } from "@/app/toast";

beforeEach(() => toastStore.setState({ message: "", action: undefined, visible: false, seq: 0 }));

describe("toast", () => {
  it("문구를 띄우면 보이고, 숨겨도 문구는 남는다 (사라지는 동안 글자가 보이도록)", () => {
    showToast("창세기 1:3 저장했어요");
    expect(toastStore.getState()).toMatchObject({ message: "창세기 1:3 저장했어요", visible: true });
    toastStore.getState().hide();
    expect(toastStore.getState()).toMatchObject({ message: "창세기 1:3 저장했어요", visible: false });
  });

  it("같은 문구를 연달아 띄우면 번호가 올라가 타이머가 다시 시작된다", () => {
    showToast("저장했어요");
    const first = toastStore.getState().seq;
    showToast("저장했어요");
    expect(toastStore.getState().seq).toBe(first + 1);
  });

  it("되돌리기 버튼이 있는 안내를 띄우고, 다음 일반 안내에서는 버튼이 사라진다", () => {
    let undone = 0;
    showToast("저장을 취소했어요", { label: "되돌리기", run: () => (undone += 1) });
    toastStore.getState().action?.run();
    expect(undone).toBe(1);
    expect(toastStore.getState().action?.label).toBe("되돌리기");

    showToast("다른 안내");
    expect(toastStore.getState().action).toBeUndefined();
  });

  it("버튼이 있는 안내는 일반 안내보다 오래 보인다", () => {
    expect(TOAST_ACTION_MS).toBeGreaterThan(TOAST_MS);
  });
});
