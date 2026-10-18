// 기기 DB 접근 (docs/spec.md 6장). SQL은 이 파일에만 둔다 — 쿼리는 db/sqlite/001_init.sql 아래쪽 예시를 따른다.
// SqlExecutor 를 받아 쓰므로 앱(Capacitor SQLite)과 테스트(Node 내장 SQLite)에서 같은 코드가 돈다.
import type { DayLog, Progress, Ref, SavedVerse, Settings } from "@/app/types";
import { isBookCode, type BookCode } from "@/data/books";
import type { Row, SqlExecutor, SqlValue } from "./db/executor";

export type SettingsPatch = {
  onboarded?: boolean;
  alarm?: Settings["alarm"];
  langs?: Settings["langs"];
  fontSize?: Settings["fontSize"];
  theme?: Settings["theme"];
  next?: Ref;
  /** null 이면 지운다 */
  pendingNext?: Ref | null;
  /** null 이면 지운다 */
  lastInterstitialDate?: string | null;
};

export type Stats = {
  completedDays: number;
  grapes: number;
  growthDay: number;
  savedCount: number;
};

const bookOf = (value: unknown): BookCode => {
  if (typeof value === "string" && isBookCode(value)) return value;
  throw new Error(`DB에 알 수 없는 책 코드가 있습니다: ${String(value)}`);
};
const str = (v: unknown) => (v == null ? undefined : String(v));

function toSettings(r: Row): Settings {
  return {
    onboarded: r.onboarded === 1,
    alarm: { enabled: r.alarm_enabled === 1, hour: Number(r.alarm_hour), minute: Number(r.alarm_minute) },
    langs: { ko: r.lang_ko === 1, en: r.lang_en === 1 },
    fontSize: r.font_size as Settings["fontSize"],
    theme: r.theme as Settings["theme"],
    next: { book: bookOf(r.next_book), chapter: Number(r.next_chapter) },
    pendingNext:
      r.pending_book == null ? undefined : { book: bookOf(r.pending_book), chapter: Number(r.pending_chapter) },
    lastInterstitialDate: str(r.last_interstitial_date),
  };
}

function toDayLog(r: Row): DayLog {
  return {
    date: String(r.date),
    ref: { book: bookOf(r.book), chapter: Number(r.chapter) },
    readAt: str(r.read_at),
    prayer: str(r.prayer),
    linkedVerseId: str(r.linked_verse_id),
    completedAt: str(r.completed_at),
    revived: r.revived === 1,
    revivedAt: str(r.revived_at),
  };
}

function toSavedVerse(r: Row): SavedVerse {
  return {
    id: String(r.id),
    ref: { book: bookOf(r.book), chapter: Number(r.chapter) },
    verse: Number(r.verse),
    preview: String(r.preview),
    savedAt: String(r.saved_at),
  };
}

export function createStorage(db: SqlExecutor) {
  // ── 설정 · 진도 ──────────────────────────────────────────────────────────
  async function getSettings(): Promise<Settings> {
    const [row] = await db.query("SELECT * FROM app_settings WHERE id = 1");
    if (!row) throw new Error("app_settings 행이 없습니다. 마이그레이션이 실행됐는지 확인하세요.");
    return toSettings(row);
  }

  async function updateSettings(patch: SettingsPatch): Promise<void> {
    const sets: [string, SqlValue][] = [];
    if (patch.onboarded !== undefined) sets.push(["onboarded", patch.onboarded ? 1 : 0]);
    if (patch.alarm) {
      sets.push(["alarm_enabled", patch.alarm.enabled ? 1 : 0]);
      sets.push(["alarm_hour", patch.alarm.hour]);
      sets.push(["alarm_minute", patch.alarm.minute]);
    }
    if (patch.langs) {
      sets.push(["lang_ko", patch.langs.ko ? 1 : 0]);
      sets.push(["lang_en", patch.langs.en ? 1 : 0]);
    }
    if (patch.fontSize) sets.push(["font_size", patch.fontSize]);
    if (patch.theme) sets.push(["theme", patch.theme]);
    if (patch.next) {
      sets.push(["next_book", patch.next.book]);
      sets.push(["next_chapter", patch.next.chapter]);
    }
    if (patch.pendingNext !== undefined) {
      sets.push(["pending_book", patch.pendingNext?.book ?? null]);
      sets.push(["pending_chapter", patch.pendingNext?.chapter ?? null]);
    }
    if (patch.lastInterstitialDate !== undefined) {
      sets.push(["last_interstitial_date", patch.lastInterstitialDate]);
    }
    if (sets.length === 0) return;
    // 열 이름은 위에서 고정한 값만 쓰므로 SQL에 직접 넣어도 안전하다
    await db.run(
      `UPDATE app_settings SET ${sets.map(([c]) => `${c} = ?`).join(", ")} WHERE id = 1`,
      sets.map(([, v]) => v),
    );
  }

  /** 진도(next·pendingNext)를 통째로 쓴다. 호출하는 쪽의 트랜잭션 안에서 쓴다. */
  async function writeProgress(progress: Progress): Promise<void> {
    await updateSettings({ next: progress.next, pendingNext: progress.pendingNext ?? null });
  }

  // ── 하루 기록 ────────────────────────────────────────────────────────────
  async function getDayLog(date: string): Promise<DayLog | undefined> {
    const [row] = await db.query("SELECT * FROM day_logs WHERE date = ?", [date]);
    return row ? toDayLog(row) : undefined;
  }

  /** 날짜 오름차순 전체. 연속 기록·달력 계산에 쓴다. */
  async function listDayLogs(): Promise<DayLog[]> {
    return (await db.query("SELECT * FROM day_logs ORDER BY date ASC")).map(toDayLog);
  }

  /** 주어진 시각(ISO) 이후에 되살린 시각들 — 되살리기 7일 제한 판단용 */
  async function listRevivedAtSince(sinceIso: string): Promise<string[]> {
    const rows = await db.query("SELECT revived_at FROM day_logs WHERE revived = 1 AND revived_at >= ?", [sinceIso]);
    return rows.map((r) => String(r.revived_at));
  }

  /** 새 미션 로그를 저장하고, 반영된 진도(pendingNext 소진)를 함께 쓴다. */
  async function createMissionLog(log: DayLog, progress: Progress): Promise<void> {
    await db.transaction(async () => {
      await db.run("INSERT OR IGNORE INTO day_logs (date, book, chapter) VALUES (?, ?, ?)", [
        log.date,
        log.ref.book,
        log.ref.chapter,
      ]);
      await writeProgress(progress);
    });
  }

  async function saveReadAt(date: string, readAt: string): Promise<void> {
    await db.run("UPDATE day_logs SET read_at = ? WHERE date = ? AND read_at IS NULL", [readAt, date]);
  }

  /** 미션 완료 기록과 다음 장 진도를 한 트랜잭션으로 쓴다. 하나라도 실패하면 전부 되돌린다. */
  async function saveCompletedMission(log: DayLog, progress: Progress): Promise<void> {
    if (!log.completedAt || log.prayer === undefined) {
      throw new Error("완료되지 않은 미션입니다");
    }
    await db.transaction(async () => {
      await db.run(
        `UPDATE day_logs SET prayer = ?, linked_verse_id = ?, completed_at = ?
         WHERE date = ? AND read_at IS NOT NULL AND completed_at IS NULL`,
        [log.prayer!, log.linkedVerseId ?? null, log.completedAt!, log.date],
      );
      const saved = await getDayLog(log.date);
      if (saved?.completedAt !== log.completedAt) {
        throw new Error(`${log.date} 미션을 완료로 저장하지 못했습니다 (읽기 기록이 없거나 이미 완료됨)`);
      }
      await writeProgress(progress);
    });
  }

  /** 놓친 날 되살리기. 이미 완료한 날은 건드리지 않는다. */
  async function reviveDay(date: string, ref: Ref, nowIso: string): Promise<void> {
    await db.run(
      `INSERT INTO day_logs (date, book, chapter, revived, revived_at) VALUES (?, ?, ?, 1, ?)
       ON CONFLICT(date) DO UPDATE SET revived = 1, revived_at = excluded.revived_at
       WHERE day_logs.completed_at IS NULL`,
      [date, ref.book, ref.chapter, nowIso],
    );
  }

  // ── 저장한 구절 ──────────────────────────────────────────────────────────
  /** 저장하거나, 취소했던 구절을 다시 저장한다. */
  async function saveVerse(verse: SavedVerse): Promise<void> {
    await db.run(
      `INSERT INTO saved_verses (id, book, chapter, verse, preview, saved_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET deleted_at = NULL, saved_at = excluded.saved_at, preview = excluded.preview`,
      [verse.id, verse.ref.book, verse.ref.chapter, verse.verse, verse.preview, verse.savedAt],
    );
  }

  async function unsaveVerse(id: string, nowIso: string): Promise<void> {
    await db.run("UPDATE saved_verses SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL", [nowIso, id]);
  }

  /** 최근 저장한 순서 */
  async function listSavedVerses(): Promise<SavedVerse[]> {
    return (await db.query("SELECT * FROM saved_verses WHERE deleted_at IS NULL ORDER BY saved_at DESC")).map(
      toSavedVerse,
    );
  }

  /** 한 장 안에서 저장한 구절 (읽기 화면 표시용) */
  async function listSavedVersesInChapter(ref: Ref): Promise<SavedVerse[]> {
    const rows = await db.query(
      "SELECT * FROM saved_verses WHERE book = ? AND chapter = ? AND deleted_at IS NULL ORDER BY verse ASC",
      [ref.book, ref.chapter],
    );
    return rows.map(toSavedVerse);
  }

  // ── 통계 ─────────────────────────────────────────────────────────────────
  async function getStats(): Promise<Stats> {
    const [row] = await db.query("SELECT * FROM v_stats");
    return {
      completedDays: Number(row.completed_days),
      grapes: Number(row.grapes),
      growthDay: Number(row.growth_day),
      savedCount: Number(row.saved_count),
    };
  }

  return {
    getSettings,
    updateSettings,
    getDayLog,
    listDayLogs,
    listRevivedAtSince,
    createMissionLog,
    saveReadAt,
    saveCompletedMission,
    reviveDay,
    saveVerse,
    unsaveVerse,
    listSavedVerses,
    listSavedVersesInChapter,
    getStats,
  };
}

export type Storage = ReturnType<typeof createStorage>;
