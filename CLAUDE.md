# CLAUDE.md — 성경-말씀숲

이 파일은 매 작업 전에 읽는 핵심 규칙 요약입니다. 자세한 기준은 `docs/spec.md`, 화면 모양은 `design/screens.html`을 따릅니다. 셋이 다르면 spec.md가 우선입니다.

## 제품
- 브랜드 컨셉: "열매 맺는 문화를 만들어 갑시다" (요 15:5 "나는 포도나무요 너희는 가지라"). 스플래시·온보딩 1·설정 앱 정보에 이 문장을 그대로 쓴다.
- 하루 1장 읽고 한 줄 기도하면 포도나무가 자라는 성경 앱. 기능은 최소로, 꾸준함에 집중.
- 오늘의 미션은 2가지뿐: ① 1장 읽기 ② 한 줄 기도(1~100자). 구절 저장은 미션이 아닌 선택 기능.
- 로그인 없음. 모든 데이터는 기기 안 SQLite(`malsseumsup.db`)에 저장. 스키마 기준은 `db/sqlite/001_init.sql` (웹 개발 중에는 jeep-sqlite).

## 기술
- Next.js 16(App Router, 정적 export `output: 'export'`) + React + TypeScript + Tailwind v4 + zustand. 서버 기능(API Route, Server Action, middleware, redirect 설정)은 쓰지 않는다. 라우팅은 `src/app/` 폴더 = 경로 1개. 화면에서 SQLite·Capacitor 플러그인·`window`는 클라이언트 컴포넌트의 `useEffect` 안에서만 쓴다.
- Next.js 16은 기존과 달라진 점이 많다. 새 API를 쓰기 전에 `node_modules/next/dist/docs/`의 해당 문서를 먼저 읽는다 (`AGENTS.md` 참고).
- Capacitor(앱 ID `kr.co.prore.malsseumsup`): @capacitor-community/sqlite, local-notifications, @capacitor-community/admob, splash-screen, status-bar, app
- 성경 본문: `public/bible/{ko,en}/{BOOK}.json`, 구조 `{ code, name, chapters: string[][] }`. 한국어 개역한글, 영어 KJV. 읽는 코드는 `src/lib/bible.ts`.
- 본문 JSON은 `scripts/build-bible.mjs`로 만든 결과물이다. **손으로 고치지 않는다.** 고칠 곳은 스크립트의 `KRV_FIXES`에 이유와 함께 추가하고 다시 생성한다. 출처·라이선스·검수 목록은 `docs/bible-data.md`.
- 절 번호는 KJV 기준이다(한·영 짝맞춤은 위치가 아니라 **절 번호**로). "(N절에 포함되어 있음)" 문구는 `isMergedVerseNote()`로 구별해 저장·기도 연결에서 뺀다.
- 규칙 로직은 `src/lib/`의 순수 함수(date, mission, streak, growth, ads, notify)로 만들고 단위 테스트를 둔다.

## 데이터베이스
- 기기 DB: `db/sqlite/001_init.sql`을 바꾸지 말고 그대로 실행한다. 스키마를 바꿔야 하면 `002_*.sql` 마이그레이션 파일을 새로 만들고 `PRAGMA user_version`을 올린다.
- 서버 DB(`db/supabase/001_init.sql`)는 다음 업데이트(로그인·동기화·우리 포도원)용. MVP에서는 쓰지 않는다.
- 성경 본문은 DB에 넣지 않는다.
- SQL은 `src/lib/storage.ts`에만 둔다. DB 접근은 `SqlExecutor`(`src/lib/db/executor.ts`) 뒤에 있어서 앱은 Capacitor SQLite, 테스트는 Node 내장 SQLite(`tests/helpers/nodeExecutor.ts`)로 같은 코드를 돌린다.
- `src/lib/db/migrations.generated.ts`는 `db/sqlite/*.sql`에서 `npm run gen:migrations`로 만든다(dev·build·test 전에 자동 실행). 직접 고치지 않는다.
- 브라우저 개발용 SQLite wasm은 jeep-sqlite가 포함한 sql.js와 같은 시기 버전이어야 한다. `package.json`의 `overrides`로 `sql.js`를 1.12.0에 고정했으니 올리지 않는다(올리면 `LinkError`). `npm run dev` 때 `public/assets/`로 복사되고 빌드 때는 빠진다.
- 전역 상태(`src/app/store.ts`)의 쓰기 작업은 한 줄로 처리한다(같은 진도를 동시에 읽고 써서 어긋나는 것을 막는다). 읽기→기도 흐름의 날짜(`activeDate`)는 메모리에만 두며, 앱을 끄거나 흐름을 떠나면 다음 날 이어서 완료할 수 없다.

## 디자인
- 색·글꼴·모서리는 spec.md 3장 토큰만 사용. 색상값을 화면 코드에 직접 쓰지 않는다.
- 주요 토큰: blue #3182F6(버튼·선택), green #36B37E(큰 배너), brand #F5A623(활성 탭·포인트), butter #FFF4DC(안내 배너), grape #7C5CDB(포도알), bg #F4F5F7 + 흰 카드, ink #191F28, gray #8B95A1
- UI 글꼴 Pretendard, 한국어 본문 나눔명조 17px / 줄간격 1.75
- 마스코트(`#mascot`)와 포도원 그림(`vineG`, `scene`, `todayMsg`, `nextMsg`)은 screens.html에서 그대로 옮긴다. 새로 그리지 않는다.
- 탭바 4개: 홈 · 성경 · 포도원 · 기록. 설정은 홈 오른쪽 위.

## 핵심 규칙
- 날짜 = 기기 현지 날짜(`YYYY-MM-DD`), 자정에 바뀜. 미션은 읽기를 시작한 날짜에 기록.
- 하루 미션 1번. 완료 시 포도알 +1, 성장일 +1, 다음 미션 장을 다음 장으로(책 끝 → 다음 책 1장, 계 22장 → 창 1장).
- "다 읽었어요"는 본문 끝까지 스크롤해야 활성.
- 성장일 = 완료한 날 수 + 1. 이정표: 1 씨앗, 2 싹 틈, 3 떡잎, 5 본잎, 7 어린 줄기, 10 덩굴손, 14 지지대, 21 가지, 30 꽃, 40 초록 송이, 50 익어 감, 70 굵어짐, 100 포도나무, 이후 100일마다 새 나무.
- 연속 기록: 완료했거나 되살린 날이 이어진 수. 어제를 놓치면 잎이 처지기만 하고 죽거나 사라지지 않음.
- 되살리기: 어제 놓침 + 그제 채워짐 + 최근 7일 미사용일 때, 보상형 광고를 끝까지 보면 어제를 되살림(연속만 유지, 포도알·성장 없음).

## 광고 (절대 규칙)
- 읽기·기도 중간에는 광고 없음.
- 전면 광고: 미션 완료 직후(완료 바텀시트 전) 하루 최대 1번, 3초 안에 준비 안 되면 건너뜀. `/pray`에서 미리 불러옴.
- 보상형: 기록 화면 되살리기에서만. 배너: 기록 화면 하단에서만.
- 개발 중에는 AdMob 공식 테스트 광고 ID만 사용. 실제 광고 단위 ID는 환경 설정 파일에, 출시 빌드에서만.
- 웹(브라우저)에서는 광고 대신 1초 모의 화면.

## 알림
- 하루 1개, 사용자가 고른 시간에, 오늘 미션을 안 했을 때만. 7일치를 예약하고 앱 열기·미션 완료·설정 변경 때마다 다시 예약.
- 놓친 날 문구는 죄책감 없는 말투로.

## 작업 방식
- 한 번에 한 작업만. 끝나면 직접 확인할 수 있는 완료 기준을 알려주고, 확인 후 커밋.
- spec.md에 없는 기능을 임의로 추가하지 않는다. 애매하면 먼저 묻는다.
