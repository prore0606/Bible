// 잠깐 떴다 사라지는 안내 문구 ("창세기 1:3 저장했어요"). 어느 화면에서든 showToast("...") 로 부른다.
import { createStore, useStore } from "zustand";

type ToastState = {
  /** 마지막으로 띄운 문구. 사라지는 동안에도 글자가 보이도록 지우지 않고 visible 만 끈다. */
  message: string;
  visible: boolean;
  /** 같은 문구를 연달아 띄워도 타이머가 다시 시작되도록 매번 올라가는 번호 */
  seq: number;
  show(message: string): void;
  hide(): void;
};

export const toastStore = createStore<ToastState>()((set, get) => ({
  message: "",
  visible: false,
  seq: 0,
  show: (message) => set({ message, visible: true, seq: get().seq + 1 }),
  hide: () => set({ visible: false }),
}));

export const showToast = (message: string) => toastStore.getState().show(message);

export const useToastState = <T,>(selector: (state: ToastState) => T): T => useStore(toastStore, selector);
