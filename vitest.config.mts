import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// 날짜 규칙(기기 현지 날짜)을 한국 시간대에서 검증한다. 워커 프로세스가 이 값을 이어받는다.
process.env.TZ = "Asia/Seoul";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
