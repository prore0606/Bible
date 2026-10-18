// DB 접근 최소 인터페이스. 앱에서는 Capacitor SQLite, 테스트에서는 Node 내장 SQLite가 구현한다.
// SQL은 이 인터페이스 위의 storage.ts에만 둔다.

export type SqlValue = string | number | null;
export type Row = Record<string, SqlValue>;

export interface SqlExecutor {
  /** 결과가 필요 없는 문장 한 개 (DDL, PRAGMA 등) */
  exec(sql: string): Promise<void>;
  /** INSERT/UPDATE/DELETE */
  run(sql: string, params?: readonly SqlValue[]): Promise<void>;
  /** SELECT */
  query<T extends Row = Row>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  /** 안의 작업을 한 트랜잭션으로 묶는다. 실패하면 되돌린다. 중첩은 지원하지 않는다. */
  transaction<T>(work: () => Promise<T>): Promise<T>;
}
