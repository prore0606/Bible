// 브라우저 개발용 SQLite(jeep-sqlite)가 쓰는 sql-wasm.wasm 을 public/assets 로 복사한다.
// jeep-sqlite 는 자기 안에 sql.js 의 JS 부분을 포함하고 있어서, wasm 도 그것과 같은 시기의 sql.js(1.12.x)여야 한다.
// 버전이 다르면 브라우저에서 "WebAssembly.instantiate(): Import ... function import requires a callable" 오류가 난다.
// 그래서 package.json 의 overrides 로 sql.js 를 1.12.0 에 고정하고, 여기서 그 버전의 wasm 을 복사한다.
// 폰 앱에서는 네이티브 SQLite를 쓰므로 필요 없고, 이 파일은 git에 올리지 않는다.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [
  join(root, "node_modules", "jeep-sqlite", "node_modules", "sql.js", "dist", "sql-wasm.wasm"),
  join(root, "node_modules", "sql.js", "dist", "sql-wasm.wasm"),
];
const source = candidates.find(existsSync);
if (!source) {
  throw new Error(`sql-wasm.wasm 을 찾지 못했습니다. npm install 을 먼저 실행하세요.\n${candidates.join("\n")}`);
}

const dest = join(root, "public", "assets");
mkdirSync(dest, { recursive: true });
copyFileSync(source, join(dest, "sql-wasm.wasm"));
console.log(`copied ${source.replace(root, ".")} -> public/assets/sql-wasm.wasm`);
