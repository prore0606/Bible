// 테스트 전용: Node 내장 SQLite(진짜 SQLite 엔진)로 SqlExecutor 를 구현한다.
// 스키마의 CHECK 제약·트리거·뷰와 storage.ts 의 SQL 을 폰 없이 그대로 검증하기 위한 것.
import { createRequire } from "node:module";
import type { Row, SqlExecutor, SqlValue } from "@/lib/db/executor";

// vite 가 node:sqlite 를 못 알아보는 경우를 피하려고 require 로 불러온다.
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");

export function createNodeExecutor(): SqlExecutor & { close(): void } {
  const db = new DatabaseSync(":memory:");
  let inTransaction = false;

  const executor: SqlExecutor & { close(): void } = {
    async exec(sql) {
      db.exec(sql);
    },
    async run(sql, params = []) {
      db.prepare(sql).run(...(params as SqlValue[]));
    },
    async query<T extends Row = Row>(sql: string, params: readonly SqlValue[] = []) {
      return db.prepare(sql).all(...(params as SqlValue[])) as T[];
    },
    async transaction(work) {
      if (inTransaction) throw new Error("중첩 트랜잭션은 지원하지 않습니다");
      inTransaction = true;
      db.exec("BEGIN");
      try {
        const result = await work();
        db.exec("COMMIT");
        return result;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      } finally {
        inTransaction = false;
      }
    },
    close() {
      db.close();
    },
  };
  return executor;
}
