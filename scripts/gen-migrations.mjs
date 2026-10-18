// db/sqlite/NNN_*.sql 을 앱 코드에서 불러올 수 있는 TS 파일로 만든다.
// SQL 파일이 기준이며, 생성된 src/lib/db/migrations.generated.ts 는 직접 고치지 않는다.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "db", "sqlite");

const files = readdirSync(dir)
  .filter((f) => /^\d{3}_.+\.sql$/.test(f))
  .sort();

const migrations = files.map((file) => ({
  version: Number(file.slice(0, 3)),
  name: file.replace(/\.sql$/, ""),
  sql: readFileSync(join(dir, file), "utf8").replace(/\r\n/g, "\n"),
}));

const versions = migrations.map((m) => m.version);
if (new Set(versions).size !== versions.length) {
  throw new Error(`마이그레이션 번호가 겹칩니다: ${versions.join(", ")}`);
}

const out = `// 자동 생성 파일 — scripts/gen-migrations.mjs (db/sqlite/*.sql 이 기준). 직접 고치지 마세요.
export type Migration = { version: number; name: string; sql: string };

export const MIGRATIONS: readonly Migration[] = ${JSON.stringify(migrations, null, 2)};
`;

writeFileSync(join(root, "src", "lib", "db", "migrations.generated.ts"), out);
console.log(`migrations: ${files.join(", ")}`);
