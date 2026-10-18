// 마이그레이션 실행. PRAGMA user_version 으로 어디까지 적용했는지 본다.
// db/sqlite/001_init.sql 은 바꾸지 않고 그대로 실행하며, 스키마가 바뀌면 002_*.sql 을 새로 만든다.
import type { SqlExecutor } from "./executor";
import { MIGRATIONS, type Migration } from "./migrations.generated";
import { splitStatements } from "./sqlSplit";

export async function getUserVersion(db: SqlExecutor): Promise<number> {
  const rows = await db.query("PRAGMA user_version");
  return Number(rows[0]?.user_version ?? 0);
}

// foreign_keys 는 DB 파일이 아니라 연결마다 설정하고, 트랜잭션 안에서는 효과가 없다.
const FOREIGN_KEYS_PRAGMA = /^PRAGMA\s+foreign_keys\b/i;

/** 연결을 열 때마다 호출한다. 적용할 마이그레이션이 없어도 foreign_keys 는 켠다. */
export async function migrate(
  db: SqlExecutor,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<number> {
  await db.exec("PRAGMA foreign_keys = ON");

  const current = await getUserVersion(db);
  const pending = [...migrations].filter((m) => m.version > current).sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    const statements = splitStatements(migration.sql).filter((s) => !FOREIGN_KEYS_PRAGMA.test(s));
    await db.transaction(async () => {
      for (const statement of statements) await db.exec(statement);
    });
    const applied = await getUserVersion(db);
    if (applied !== migration.version) {
      throw new Error(
        `${migration.name}: 적용 후 user_version 이 ${applied} 입니다 (기대값 ${migration.version}). SQL 파일 끝에 PRAGMA user_version = ${migration.version}; 가 있는지 확인하세요.`,
      );
    }
  }

  return getUserVersion(db);
}
