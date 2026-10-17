-- ⚠️ 이 파일은 폰 안 SQLite용입니다. Supabase(PostgreSQL) SQL Editor에서 실행하지 마세요.
--    (PRAGMA 같은 SQLite 전용 명령 때문에 오류가 납니다.)
--    Supabase에는 db/supabase/001_init.sql 을 실행하세요.
-- =====================================================================
-- 성경-말씀숲 · 기기 안 DB (SQLite) · 스키마 v1
-- 사용: @capacitor-community/sqlite (웹 개발 중에는 jeep-sqlite)
-- DB 이름: malsseumsup.db   /   버전 관리: PRAGMA user_version
--
-- 원칙
--  * 성경 본문은 DB에 넣지 않는다 (public/bible/{ko,en}/{BOOK}.json).
--  * 날짜 키는 기기 현지 날짜 'YYYY-MM-DD', 시각은 ISO 8601 UTC 문자열.
--  * 서버(Supabase) 동기화를 대비해 모든 사용자 데이터에 updated_at,
--    지울 수 있는 데이터에는 deleted_at(소프트 삭제)을 둔다.
--  * 연속 일수(streak)는 날짜 계산이 필요해 앱 코드(streak.ts)에서 계산한다.
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- 1. 앱 설정 · 진도 (항상 1행)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  id                     INTEGER PRIMARY KEY CHECK (id = 1),
  onboarded              INTEGER NOT NULL DEFAULT 0 CHECK (onboarded IN (0, 1)),

  -- 알림 (기기마다 다르므로 서버로 동기화하지 않음)
  alarm_enabled          INTEGER NOT NULL DEFAULT 1 CHECK (alarm_enabled IN (0, 1)),
  alarm_hour             INTEGER NOT NULL DEFAULT 7 CHECK (alarm_hour BETWEEN 0 AND 23),
  alarm_minute           INTEGER NOT NULL DEFAULT 0 CHECK (alarm_minute BETWEEN 0 AND 59),

  -- 보기 설정
  lang_ko                INTEGER NOT NULL DEFAULT 1 CHECK (lang_ko IN (0, 1)),
  lang_en                INTEGER NOT NULL DEFAULT 0 CHECK (lang_en IN (0, 1)),
  font_size              TEXT    NOT NULL DEFAULT 'm' CHECK (font_size IN ('s', 'm', 'l')),
  theme                  TEXT    NOT NULL DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),

  -- 진도: 다음 미션에서 읽을 장, 설정에서 바꾼 읽는 곳(다음 미션부터 적용)
  next_book              TEXT    NOT NULL DEFAULT 'GEN' CHECK (length(next_book) = 3),
  next_chapter           INTEGER NOT NULL DEFAULT 1 CHECK (next_chapter >= 1),
  pending_book           TEXT    CHECK (pending_book IS NULL OR length(pending_book) = 3),
  pending_chapter        INTEGER CHECK (pending_chapter IS NULL OR pending_chapter >= 1),

  -- 광고: 오늘 전면 광고를 이미 보여줬는지
  last_interstitial_date TEXT,

  -- 서버 동기화 (다음 업데이트)
  last_synced_at         TEXT,

  created_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  CHECK (lang_ko = 1 OR lang_en = 1),                                    -- 언어는 최소 하나
  CHECK ((pending_book IS NULL) = (pending_chapter IS NULL))             -- 둘 다 있거나 둘 다 없음
);

INSERT OR IGNORE INTO app_settings (id) VALUES (1);

-- ---------------------------------------------------------------------
-- 2. 하루 기록 (미션 1개 = 1행)
--    미션은 '읽기를 시작한 날짜'에 기록 (자정을 넘겨 완료해도 그 날짜)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS day_logs (
  date             TEXT    PRIMARY KEY CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  book             TEXT    NOT NULL CHECK (length(book) = 3),
  chapter          INTEGER NOT NULL CHECK (chapter >= 1),

  read_at          TEXT,                       -- 읽기 완료 시각
  prayer           TEXT    CHECK (prayer IS NULL OR length(trim(prayer)) BETWEEN 1 AND 100),
  linked_verse_id  TEXT,                       -- saved_verses.id (예: 'GEN.1.3')
  completed_at     TEXT,                       -- 미션 완료 시각

  revived          INTEGER NOT NULL DEFAULT 0 CHECK (revived IN (0, 1)),
  revived_at       TEXT,                       -- 보상형 광고로 되살린 시각

  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  -- 미션 완료는 읽기 완료와 기도가 있어야만
  CHECK (completed_at IS NULL OR (read_at IS NOT NULL AND prayer IS NOT NULL)),
  -- 되살린 날은 읽지 않은 날이며, 되살린 시각이 있어야 함
  CHECK (revived = 0 OR (completed_at IS NULL AND revived_at IS NOT NULL)),

  FOREIGN KEY (linked_verse_id) REFERENCES saved_verses(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_day_logs_completed ON day_logs (completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_day_logs_revived   ON day_logs (revived_at)   WHERE revived = 1;
CREATE INDEX IF NOT EXISTS idx_day_logs_updated   ON day_logs (updated_at);

-- ---------------------------------------------------------------------
-- 3. 저장한 구절 (책갈피)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_verses (
  id          TEXT    PRIMARY KEY,             -- '{BOOK}.{장}.{절}' 예: 'GEN.1.3'
  book        TEXT    NOT NULL CHECK (length(book) = 3),
  chapter     INTEGER NOT NULL CHECK (chapter >= 1),
  verse       INTEGER NOT NULL CHECK (verse >= 1),
  preview     TEXT    NOT NULL CHECK (length(preview) <= 40),   -- 한국어 본문 앞 40자
  saved_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at  TEXT,                            -- 저장 취소·삭제 (동기화용 소프트 삭제)
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  CHECK (id = book || '.' || chapter || '.' || verse)
);

CREATE INDEX IF NOT EXISTS idx_saved_verses_active ON saved_verses (saved_at DESC) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- 4. updated_at 자동 갱신
-- ---------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_app_settings_updated
AFTER UPDATE ON app_settings FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE app_settings SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_day_logs_updated
AFTER UPDATE ON day_logs FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE day_logs SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE date = NEW.date;
END;

CREATE TRIGGER IF NOT EXISTS trg_saved_verses_updated
AFTER UPDATE ON saved_verses FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE saved_verses SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;

-- 미션 완료는 되돌리지 않는다 (completed_at을 NULL로 바꾸는 수정 금지)
CREATE TRIGGER IF NOT EXISTS trg_day_logs_keep_completed
BEFORE UPDATE OF completed_at ON day_logs FOR EACH ROW
WHEN OLD.completed_at IS NOT NULL AND NEW.completed_at IS NULL
BEGIN
  SELECT RAISE(ABORT, 'completed mission cannot be undone');
END;

-- ---------------------------------------------------------------------
-- 5. 통계 뷰 (명세서 6장 '계산해서 쓰는 값')
-- ---------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_stats AS
SELECT
  (SELECT COUNT(*) FROM day_logs WHERE completed_at IS NOT NULL)      AS completed_days,  -- 완료한 날 수
  (SELECT COUNT(*) FROM day_logs WHERE completed_at IS NOT NULL)      AS grapes,          -- 포도알 수
  (SELECT COUNT(*) FROM day_logs WHERE completed_at IS NOT NULL) + 1  AS growth_day,      -- 포도원 성장일
  (SELECT COUNT(*) FROM saved_verses WHERE deleted_at IS NULL)        AS saved_count;     -- 저장한 구절 수

-- 기록 화면 달력: 한 달치 상태 (completed / revived / started)
CREATE VIEW IF NOT EXISTS v_calendar AS
SELECT
  date,
  CASE
    WHEN completed_at IS NOT NULL THEN 'completed'
    WHEN revived = 1              THEN 'revived'
    ELSE 'started'
  END AS status
FROM day_logs;

-- 기록 화면 기도 카드
CREATE VIEW IF NOT EXISTS v_prayer_cards AS
SELECT
  d.date, d.book, d.chapter, d.prayer, d.completed_at,
  s.id AS verse_id, s.verse, s.preview
FROM day_logs d
LEFT JOIN saved_verses s ON s.id = d.linked_verse_id AND s.deleted_at IS NULL
WHERE d.completed_at IS NOT NULL
ORDER BY d.date DESC;

PRAGMA user_version = 1;

-- =====================================================================
-- 앱에서 쓰는 주요 쿼리 예시 (lib/*.ts에서 파라미터로 실행)
-- =====================================================================
-- [오늘 미션 만들기]  /read 진입 시, 오늘 행이 없을 때만
--   INSERT OR IGNORE INTO day_logs (date, book, chapter) VALUES (:today, :book, :chapter);
-- [읽기 완료]
--   UPDATE day_logs SET read_at = :now WHERE date = :date AND read_at IS NULL;
-- [미션 완료]
--   UPDATE day_logs SET prayer = :prayer, linked_verse_id = :verseId, completed_at = :now
--   WHERE date = :date AND read_at IS NOT NULL AND completed_at IS NULL;
--   UPDATE app_settings SET next_book = :nextBook, next_chapter = :nextChapter WHERE id = 1;
-- [구절 저장 / 다시 저장]
--   INSERT INTO saved_verses (id, book, chapter, verse, preview) VALUES (:id, :book, :ch, :v, :preview)
--   ON CONFLICT(id) DO UPDATE SET deleted_at = NULL, saved_at = excluded.saved_at, preview = excluded.preview;
-- [구절 저장 취소]
--   UPDATE saved_verses SET deleted_at = :now WHERE id = :id;
-- [되살리기 가능 여부: 최근 7일 안에 쓴 적 있나]
--   SELECT COUNT(*) FROM day_logs WHERE revived = 1 AND revived_at >= :sevenDaysAgoIso;
-- [어제 되살리기]
--   INSERT INTO day_logs (date, book, chapter, revived, revived_at) VALUES (:yesterday, :book, :chapter, 1, :now)
--   ON CONFLICT(date) DO UPDATE SET revived = 1, revived_at = excluded.revived_at
--   WHERE day_logs.completed_at IS NULL;
-- [연속 일수 계산용: 채워진 날 목록, 최근 순]
--   SELECT date FROM day_logs WHERE completed_at IS NOT NULL OR revived = 1 ORDER BY date DESC;
