import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getUserVersion, migrate } from "@/lib/db/migrate";
import { MIGRATIONS } from "@/lib/db/migrations.generated";
import { splitStatements } from "@/lib/db/sqlSplit";
import { createNodeExecutor } from "../helpers/nodeExecutor";

describe("splitStatements", () => {
  it("세미콜론으로 문장을 나누고 주석을 버린다", () => {
    const sql = `
      -- 주석; 안의 세미콜론
      CREATE TABLE a (x INTEGER); /* 블록; 주석 */
      INSERT INTO a VALUES (1);
    `;
    expect(splitStatements(sql)).toEqual(["CREATE TABLE a (x INTEGER)", "INSERT INTO a VALUES (1)"]);
  });

  it("문자열 안의 ';' 와 '--' 는 그대로 둔다", () => {
    expect(splitStatements("INSERT INTO t VALUES ('a;b -- c', 'it''s');")).toEqual([
      "INSERT INTO t VALUES ('a;b -- c', 'it''s')",
    ]);
  });

  it("CREATE TRIGGER 본문의 ';' 에서는 자르지 않고 END; 에서 자른다", () => {
    const sql = `
      CREATE TRIGGER trg AFTER UPDATE ON t FOR EACH ROW
      BEGIN
        UPDATE t SET y = 1 WHERE x = NEW.x;
        UPDATE t SET z = 2 WHERE x = NEW.x;
      END;
      SELECT 1;
    `;
    const result = splitStatements(sql);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatch(/^CREATE TRIGGER trg[\s\S]*END$/);
    expect(result[0]).toContain("UPDATE t SET z = 2");
    expect(result[1]).toBe("SELECT 1");
  });

  it("마지막 문장에 세미콜론이 없어도 포함한다", () => {
    expect(splitStatements("SELECT 1; SELECT 2")).toEqual(["SELECT 1", "SELECT 2"]);
  });

  it("db/sqlite/001_init.sql: 테이블 3 + 트리거 4 + 뷰 3 + 인덱스 4 등으로 나뉜다", () => {
    const statements = splitStatements(MIGRATIONS[0].sql);
    const count = (re: RegExp) => statements.filter((s) => re.test(s)).length;
    expect(count(/^CREATE TABLE/i)).toBe(3);
    expect(count(/^CREATE TRIGGER/i)).toBe(4);
    expect(count(/^CREATE VIEW/i)).toBe(3);
    expect(count(/^CREATE INDEX/i)).toBe(4);
    expect(count(/^PRAGMA/i)).toBe(2); // foreign_keys, user_version
    // 트리거 문장은 BEGIN ... END 까지 온전해야 한다
    for (const s of statements.filter((x) => /^CREATE TRIGGER/i.test(x))) {
      expect(s).toMatch(/\bBEGIN\b[\s\S]*\bEND$/i);
    }
  });
});

describe("migrations.generated.ts", () => {
  it("db/sqlite 의 SQL 파일과 같다 (npm run gen:migrations 로 다시 만들 수 있다)", () => {
    const file = readFileSync(join(process.cwd(), "db", "sqlite", "001_init.sql"), "utf8").replace(/\r\n/g, "\n");
    expect(MIGRATIONS).toHaveLength(1);
    expect(MIGRATIONS[0]).toMatchObject({ version: 1, name: "001_init" });
    expect(MIGRATIONS[0].sql).toBe(file);
  });
});

describe("migrate (진짜 SQLite 엔진)", () => {
  const dbs: ReturnType<typeof createNodeExecutor>[] = [];
  const fresh = () => {
    const db = createNodeExecutor();
    dbs.push(db);
    return db;
  };
  afterEach(() => {
    while (dbs.length) dbs.pop()!.close();
  });

  it("빈 DB 에 001_init.sql 을 실행해 user_version 1 이 된다", async () => {
    const db = fresh();
    expect(await getUserVersion(db)).toBe(0);
    expect(await migrate(db)).toBe(1);
  });

  it("테이블·뷰·트리거가 모두 만들어진다", async () => {
    const db = fresh();
    await migrate(db);
    const names = async (type: string) =>
      (await db.query<{ name: string }>("SELECT name FROM sqlite_master WHERE type = ? ORDER BY name", [type])).map(
        (r) => r.name,
      );
    expect(await names("table")).toEqual(expect.arrayContaining(["app_settings", "day_logs", "saved_verses"]));
    expect(await names("view")).toEqual(["v_calendar", "v_prayer_cards", "v_stats"]);
    expect(await names("trigger")).toEqual([
      "trg_app_settings_updated",
      "trg_day_logs_keep_completed",
      "trg_day_logs_updated",
      "trg_saved_verses_updated",
    ]);
  });

  it("app_settings 는 기본값으로 1행 들어 있다", async () => {
    const db = fresh();
    await migrate(db);
    const rows = await db.query("SELECT * FROM app_settings");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 1,
      onboarded: 0,
      alarm_hour: 7,
      alarm_minute: 0,
      lang_ko: 1,
      lang_en: 0,
      font_size: "m",
      theme: "system",
      next_book: "GEN",
      next_chapter: 1,
    });
  });

  it("두 번 실행해도 안전하고 데이터를 지우지 않는다", async () => {
    const db = fresh();
    await migrate(db);
    await db.run("UPDATE app_settings SET onboarded = 1 WHERE id = 1");
    expect(await migrate(db)).toBe(1);
    const [row] = await db.query<{ onboarded: number }>("SELECT onboarded FROM app_settings");
    expect(row.onboarded).toBe(1);
  });

  it("foreign_keys 가 켜져 있다", async () => {
    const db = fresh();
    await migrate(db);
    const [row] = await db.query<{ foreign_keys: number }>("PRAGMA foreign_keys");
    expect(row.foreign_keys).toBe(1);
  });

  it("중간에 실패하면 되돌리고 user_version 이 오르지 않는다", async () => {
    const db = fresh();
    const broken = [{ version: 1, name: "001_broken", sql: "CREATE TABLE ok (x INTEGER); CREATE TABLE ok (x INTEGER);\nPRAGMA user_version = 1;" }];
    await expect(migrate(db, broken)).rejects.toThrow();
    expect(await getUserVersion(db)).toBe(0);
    const tables = await db.query("SELECT name FROM sqlite_master WHERE name = 'ok'");
    expect(tables).toHaveLength(0);
  });

  it("SQL 파일이 user_version 을 올리지 않으면 알려 준다", async () => {
    const db = fresh();
    await expect(migrate(db, [{ version: 1, name: "001_x", sql: "CREATE TABLE t (x INTEGER);" }])).rejects.toThrow(
      /user_version/,
    );
  });
});

describe("스키마 규칙 (docs/spec.md 6장 'DB가 직접 막는 규칙')", () => {
  const dbs: ReturnType<typeof createNodeExecutor>[] = [];
  afterEach(() => {
    while (dbs.length) dbs.pop()!.close();
  });
  const setup = async () => {
    const db = createNodeExecutor();
    dbs.push(db);
    await migrate(db);
    await db.run("INSERT INTO day_logs (date, book, chapter) VALUES ('2026-10-18', 'GEN', 1)");
    return db;
  };

  it("기도는 공백 제외 1~100자", async () => {
    const db = await setup();
    await db.run("UPDATE day_logs SET read_at = '2026-10-18T01:00:00.000Z' WHERE date = '2026-10-18'");
    const complete = (prayer: string) =>
      db.run("UPDATE day_logs SET prayer = ?, completed_at = '2026-10-18T01:05:00.000Z' WHERE date = '2026-10-18'", [
        prayer,
      ]);
    await expect(complete("   ")).rejects.toThrow();
    await expect(complete("가".repeat(101))).rejects.toThrow();
    await expect(complete("가".repeat(100))).resolves.toBeUndefined();
  });

  it("읽기 없이는 미션을 완료할 수 없다", async () => {
    const db = await setup();
    await expect(
      db.run("UPDATE day_logs SET prayer = '기도', completed_at = '2026-10-18T01:05:00.000Z' WHERE date = '2026-10-18'"),
    ).rejects.toThrow();
  });

  it("완료한 미션은 되돌릴 수 없다 (트리거)", async () => {
    const db = await setup();
    await db.run(
      "UPDATE day_logs SET read_at = '2026-10-18T01:00:00.000Z', prayer = '기도', completed_at = '2026-10-18T01:05:00.000Z' WHERE date = '2026-10-18'",
    );
    await expect(db.run("UPDATE day_logs SET completed_at = NULL WHERE date = '2026-10-18'")).rejects.toThrow(
      /cannot be undone/,
    );
  });

  it("되살린 날은 완료할 수 없고 되살린 시각이 있어야 한다", async () => {
    const db = await setup();
    await expect(db.run("UPDATE day_logs SET revived = 1 WHERE date = '2026-10-18'")).rejects.toThrow();
    await expect(
      db.run("UPDATE day_logs SET revived = 1, revived_at = '2026-10-19T01:00:00.000Z' WHERE date = '2026-10-18'"),
    ).resolves.toBeUndefined();
  });

  it("언어는 최소 하나 켜져 있어야 한다", async () => {
    const db = await setup();
    await expect(db.run("UPDATE app_settings SET lang_ko = 0, lang_en = 0")).rejects.toThrow();
  });

  it("updated_at 이 트리거로 자동 갱신된다", async () => {
    const db = await setup();
    await db.run("UPDATE day_logs SET updated_at = '2000-01-01T00:00:00.000Z' WHERE date = '2026-10-18'");
    await db.run("UPDATE day_logs SET read_at = '2026-10-18T01:00:00.000Z' WHERE date = '2026-10-18'");
    const [row] = await db.query<{ updated_at: string }>("SELECT updated_at FROM day_logs");
    expect(row.updated_at > "2020-01-01").toBe(true);
  });

  it("v_stats: 완료한 날 수 = 포도알, 성장일 = +1, 저장 구절은 삭제 안 된 것만", async () => {
    const db = await setup();
    await db.run("INSERT INTO saved_verses (id, book, chapter, verse, preview) VALUES ('GEN.1.3', 'GEN', 1, 3, '빛')");
    await db.run(
      "INSERT INTO saved_verses (id, book, chapter, verse, preview, deleted_at) VALUES ('GEN.1.4', 'GEN', 1, 4, '좋았더라', '2026-10-18T00:00:00.000Z')",
    );
    await db.run(
      "UPDATE day_logs SET read_at = '2026-10-18T01:00:00.000Z', prayer = '기도', completed_at = '2026-10-18T01:05:00.000Z' WHERE date = '2026-10-18'",
    );
    const [stats] = await db.query("SELECT * FROM v_stats");
    expect(stats).toEqual({ completed_days: 1, grapes: 1, growth_day: 2, saved_count: 1 });
  });
});
