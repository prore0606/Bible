// 나눔명조(@fontsource) CSS 에서 woff2 만 가리키도록 줄인 CSS 를 만든다.
// 패키지 CSS 는 woff2 와 woff 를 둘 다 가리켜서 그대로 쓰면 앱 번들에 같은 글꼴이 두 번 들어간다(약 5 MB 낭비).
// 결과: src/styles/nanum-myeongjo.css  (git 에 포함. 패키지 버전을 올렸을 때만 다시 만든다)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = join(root, "node_modules", "@fontsource", "nanum-myeongjo");
const WEIGHTS = [400, 700]; // 본문 400, 굵은 인용 700

let out = `/* 자동 생성 파일 — scripts/gen-fonts.mjs (직접 고치지 마세요)
 * 나눔명조 (SIL Open Font License 1.1), @fontsource/nanum-myeongjo, woff2 만 사용
 */
`;
let blocks = 0;
for (const weight of WEIGHTS) {
  const css = readFileSync(join(pkgDir, `${weight}.css`), "utf8");
  for (const block of css.match(/@font-face\s*\{[^}]*\}/g) ?? []) {
    const woff2 = /url\(\.\/files\/([^)]+\.woff2)\)/.exec(block);
    if (!woff2) throw new Error(`woff2 주소가 없는 블록: ${block.slice(0, 80)}`);
    const rewritten = block.replace(
      /src:[^;]+;/,
      `src: url(../../node_modules/@fontsource/nanum-myeongjo/files/${woff2[1]}) format("woff2");`,
    );
    out += `${rewritten}\n`;
    blocks += 1;
  }
}

mkdirSync(join(root, "src", "styles"), { recursive: true });
writeFileSync(join(root, "src", "styles", "nanum-myeongjo.css"), out);
console.log(`nanum-myeongjo.css: ${blocks} @font-face blocks`);
