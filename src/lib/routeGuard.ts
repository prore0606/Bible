// 경로 보호 (docs/spec.md 5장). 정적 export 에는 서버 redirect 가 없으므로 앱 안에서 어디로 보낼지 정한다.
//
// - 첫 실행을 마치지 않았으면 첫 실행 화면(01~07) 외에는 들어갈 수 없다 → 스플래시로 보낸다.
// - 마친 뒤에는 온보딩·시작하기·시작 설정 화면이 필요 없다 → 홈으로 보낸다.
// - 스플래시(01)와 첫 씨앗(07)은 마친 뒤에도 열 수 있다: 스플래시는 매 실행의 입구이고,
//   첫 씨앗은 onboarded 를 저장한 직후에 보여 줘야 한다.

const FIRST_RUN_PATHS = new Set(["/", "/splash", "/onboarding", "/start", "/setup/book", "/setup/alarm", "/seed"]);
const ONLY_BEFORE_ONBOARDED = new Set(["/onboarding", "/start", "/setup/book", "/setup/alarm"]);

/** "/home/" → "/home" (정적 export 는 trailingSlash 라서 끝에 / 가 붙는다) */
export function normalizePath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

/** 이동해야 하면 갈 곳(trailing slash 포함)을, 그대로 둬도 되면 null 을 돌려준다. */
export function guardTarget(pathname: string, onboarded: boolean): string | null {
  const path = normalizePath(pathname);
  if (!onboarded) {
    return FIRST_RUN_PATHS.has(path) ? null : "/splash/";
  }
  return ONLY_BEFORE_ONBOARDED.has(path) ? "/home/" : null;
}
