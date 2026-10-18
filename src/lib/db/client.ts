// 앱 전체에서 하나만 쓰는 저장소. 처음 부를 때 DB를 열고 마이그레이션까지 마친다.
// 브라우저(클라이언트)에서만 부른다 — 정적 export 빌드 때 서버에서는 호출되지 않아야 한다.
import { createStorage, type Storage } from "../storage";
import { migrate } from "./migrate";

let ready: Promise<Storage> | undefined;

export function getStorage(): Promise<Storage> {
  // React StrictMode 의 이중 실행에도 한 번만 열도록 약속(Promise)을 공유한다
  ready ??= (async () => {
    const { openCapacitorExecutor } = await import("./capacitorExecutor");
    const db = await openCapacitorExecutor();
    await migrate(db);
    return createStorage(db);
  })().catch((error) => {
    ready = undefined; // 실패하면 다음에 다시 시도할 수 있게 한다
    throw error;
  });
  return ready;
}
