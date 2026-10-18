// 앱에서 쓰는 SqlExecutor. 폰에서는 네이티브 SQLite, 브라우저 개발 중에는 jeep-sqlite(IndexedDB 기반)로 열린다.
// 브라우저 전용 API를 쓰므로 클라이언트에서만 불러온다 (dynamic import).
import type { Row, SqlExecutor, SqlValue } from "./executor";

export const DB_NAME = "malsseumsup";
const DB_VERSION = 1;

/** iOS 는 query 결과 맨 앞에 컬럼 이름 목록 행(ios_columns)을 끼워 준다 */
const isMetaRow = (row: Row) => "ios_columns" in row;

async function ensureWebStore(): Promise<void> {
  const { defineCustomElements } = await import("jeep-sqlite/loader");
  defineCustomElements(window);
  if (!document.querySelector("jeep-sqlite")) {
    document.body.appendChild(document.createElement("jeep-sqlite"));
  }
  await customElements.whenDefined("jeep-sqlite");
}

export async function openCapacitorExecutor(): Promise<SqlExecutor> {
  const [{ Capacitor }, { CapacitorSQLite, SQLiteConnection }] = await Promise.all([
    import("@capacitor/core"),
    import("@capacitor-community/sqlite"),
  ]);

  const isWeb = Capacitor.getPlatform() === "web";
  const sqlite = new SQLiteConnection(CapacitorSQLite);

  if (isWeb) {
    await ensureWebStore();
    await sqlite.initWebStore();
  }

  const consistent = (await sqlite.checkConnectionsConsistency()).result;
  const exists = (await sqlite.isConnection(DB_NAME, false)).result;
  const conn =
    consistent && exists
      ? await sqlite.retrieveConnection(DB_NAME, false)
      : await sqlite.createConnection(DB_NAME, false, "no-encryption", DB_VERSION, false);
  await conn.open();

  // 웹(IndexedDB)은 명시적으로 저장해야 새로고침 뒤에도 남는다. 네이티브는 필요 없다.
  const persist = async () => {
    if (isWeb) await sqlite.saveToStore(DB_NAME);
  };

  let inTransaction = false;

  return {
    async exec(sql) {
      await conn.execute(sql, false);
      if (!inTransaction) await persist();
    },
    async run(sql, params = []) {
      await conn.run(sql, [...params] as SqlValue[], false);
      if (!inTransaction) await persist();
    },
    async query<T extends Row = Row>(sql: string, params: readonly SqlValue[] = []) {
      const result = await conn.query(sql, [...params] as SqlValue[]);
      return ((result.values ?? []) as Row[]).filter((row) => !isMetaRow(row)) as T[];
    },
    async transaction(work) {
      if (inTransaction) throw new Error("중첩 트랜잭션은 지원하지 않습니다");
      inTransaction = true;
      await conn.beginTransaction();
      try {
        const result = await work();
        await conn.commitTransaction();
        inTransaction = false;
        await persist();
        return result;
      } catch (error) {
        inTransaction = false;
        if ((await conn.isTransactionActive()).result) await conn.rollbackTransaction();
        throw error;
      }
    },
  };
}
