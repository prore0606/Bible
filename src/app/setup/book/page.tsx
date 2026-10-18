"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { appStore, useAppStore } from "@/app/store";
import type { Ref } from "@/app/types";
import BookPicker from "@/components/BookPicker";
import { BottomBar, Button, Heading, Screen } from "@/components/ui";
import { DEFAULT_START, formatRef } from "@/lib/ref";

// 05 시작할 장 (1/2): 책과 장을 골라 settings.next 에 저장한다
export default function SetupBookPage() {
  const router = useRouter();
  const saved = useAppStore((s) => s.settings?.next);
  const [ref, setRef] = useState<Ref>(saved ?? DEFAULT_START);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const next = async () => {
    setSaving(true);
    setError(undefined);
    try {
      await appStore.getState().updateSettings({ next: ref });
      router.push("/setup/alarm/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요. 다시 시도해 주세요.");
      setSaving(false);
    }
  };

  return (
    <Screen withBottomBar>
      <div className="text-[13px] font-extrabold text-grape">1 / 2</div>
      <div className="mt-1">
        <Heading size="md">어디서부터 읽을까요?</Heading>
      </div>
      <div className="mt-4">
        <BookPicker value={ref} onChange={setRef} />
      </div>

      <BottomBar className="bg-bg">
        <div
          className="mb-3 flex items-center justify-between rounded-[12px] bg-butter px-4 py-3 text-[14px] text-butter-text"
          aria-live="polite"
        >
          <span>시작할 곳</span>
          <b className="text-[17px] text-ink">{formatRef(ref)}</b>
        </div>
        {error && <p className="mb-2 text-center text-[13px] text-butter-text">{error}</p>}
        <Button onClick={next} disabled={saving}>
          다음
        </Button>
      </BottomBar>
    </Screen>
  );
}
