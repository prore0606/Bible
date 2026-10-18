// 잠깐 떴다 사라지는 안내 문구 ("창세기 1:3 저장했어요"). 어느 화면에서든 showToast("...") 로 부른다.
// 삭제 같은 되돌릴 수 있는 일에는 action 으로 "되돌리기" 버튼을 함께 띄운다 (확인 창 대신).
import { createStore, useStore } from "zustand";

export type ToastAction = { label: string; run: () => void };

type ToastState = {
  /** 마지막으로 띄운 문구. 사라지는 동안에도 글자가 보이도록 지우지 않고 visible 만 끈다. */
  message: string;
  action?: ToastAction;
  visible: boolean;
  /** 같은 문구를 연달아 띄워도 타이머가 다시 시작되도록 매번 올라가는 번호 */
  seq: number;
  show(message: string, action?: ToastAction): void;
  hide(): void;
};

/** 일반 안내가 보이는 시간 / 버튼이 있는 안내가 보이는 시간(누를 여유를 준다) */
export const TOAST_MS = 1600;
export const TOAST_ACTION_MS = 5000;

export const toastStore = createStore<ToastState>()((set, get) => ({
  message: "",
  visible: false,
  seq: 0,
  show: (message, action) => set({ message, action, visible: true, seq: get().seq + 1 }),
  hide: () => set({ visible: false }),
}));

export const showToast = (message: string, action?: ToastAction) => toastStore.getState().show(message, action);

export const useToastState = <T,>(selector: (state: ToastState) => T): T => useStore(toastStore, selector);
