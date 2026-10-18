import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

// 앱 정보 화면에 보이는 버전은 package.json 의 version 이다 (출시 때 1.0.0 등으로 올린다)
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

// Capacitor 앱에 담기 위한 정적 export 설정 (서버 없음)
const nextConfig: NextConfig = {
  output: "export",
  env: { NEXT_PUBLIC_APP_VERSION: version },
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
