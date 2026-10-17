"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// 정적 export에서는 서버 redirect를 쓸 수 없어 클라이언트에서 이동한다.
export default function Root() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/splash/");
  }, [router]);
  return null;
}
