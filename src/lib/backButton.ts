// 안드로이드 뒤로가기 규칙 (docs/spec.md 5장 탭바 아래). 어디로 갈지만 정하는 순수 함수라서 테스트할 수 있다.
import { normalizePath } from "@/lib/routeGuard";

export type BackAction =
  | "home" // 흐름을 끝내고 홈으로 (읽기·기도·완료)
  | "history" // 바로 전 화면으로
  | "exit-guard" // 한 번 더 누르면 종료
  | "ignore"; // 아무 일도 없음 (광고 중, 첫 씨앗)

const FLOW_PATHS = new Set(["/read", "/pray", "/done"]);
const EXIT_PATHS = new Set(["/", "/splash", "/home", "/vineyard", "/records"]);

/** search: 주소의 "?book=PSA&chapter=23" 부분. 성경 탭은 책을 고른 뒤(자유 읽기)에만 한 단계 뒤로 간다. */
export function backAction(pathname: string, search = ""): BackAction {
  const path = normalizePath(pathname);
  if (FLOW_PATHS.has(path)) return "home";
  if (path === "/ad" || path === "/seed") return "ignore";
  if (path === "/bible") return new URLSearchParams(search).has("book") ? "history" : "exit-guard";
  if (EXIT_PATHS.has(path)) return "exit-guard";
  return "history";
}

/** "한 번 더 누르면 종료" 안내가 떠 있는 시간(ms) */
export const EXIT_WINDOW_MS = 2000;
export const EXIT_HINT = "한 번 더 누르면 종료돼요";

/** 직전에 누른 시각(없으면 undefined)과 지금으로 종료할지 정한다. */
export function shouldExit(lastPressAt: number | undefined, now: number): boolean {
  return lastPressAt !== undefined && now - lastPressAt <= EXIT_WINDOW_MS;
}
