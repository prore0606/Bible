-- 002: 글자 크기에 '아주 크게'(xl) 추가
-- SQLite 는 CHECK 제약을 직접 바꿀 수 없어서 app_settings 를 새로 만들어 옮긴다. 열은 001 과 같고 font_size 의 허용값만 늘었다.

CREATE TABLE app_settings_new (
  id                     INTEGER PRIMARY KEY CHECK (id = 1),
  onboarded              INTEGER NOT NULL DEFAULT 0 CHECK (onboarded IN (0, 1)),

  alarm_enabled          INTEGER NOT NULL DEFAULT 1 CHECK (alarm_enabled IN (0, 1)),
  alarm_hour             INTEGER NOT NULL DEFAULT 7 CHECK (alarm_hour BETWEEN 0 AND 23),
  alarm_minute           INTEGER NOT NULL DEFAULT 0 CHECK (alarm_minute BETWEEN 0 AND 59),

  lang_ko                INTEGER NOT NULL DEFAULT 1 CHECK (lang_ko IN (0, 1)),
  lang_en                INTEGER NOT NULL DEFAULT 0 CHECK (lang_en IN (0, 1)),
  font_size              TEXT    NOT NULL DEFAULT 'm' CHECK (font_size IN ('s', 'm', 'l', 'xl')),
  theme                  TEXT    NOT NULL DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),

  next_book              TEXT    NOT NULL DEFAULT 'GEN' CHECK (length(next_book) = 3),
  next_chapter           INTEGER NOT NULL DEFAULT 1 CHECK (next_chapter >= 1),
  pending_book           TEXT    CHECK (pending_book IS NULL OR length(pending_book) = 3),
  pending_chapter        INTEGER CHECK (pending_chapter IS NULL OR pending_chapter >= 1),

  last_interstitial_date TEXT,
  last_synced_at         TEXT,

  created_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  CHECK (lang_ko = 1 OR lang_en = 1),
  CHECK ((pending_book IS NULL) = (pending_chapter IS NULL))
);

INSERT INTO app_settings_new (
  id, onboarded, alarm_enabled, alarm_hour, alarm_minute, lang_ko, lang_en, font_size, theme,
  next_book, next_chapter, pending_book, pending_chapter, last_interstitial_date, last_synced_at, created_at, updated_at
)
SELECT
  id, onboarded, alarm_enabled, alarm_hour, alarm_minute, lang_ko, lang_en, font_size, theme,
  next_book, next_chapter, pending_book, pending_chapter, last_interstitial_date, last_synced_at, created_at, updated_at
FROM app_settings;

DROP TABLE app_settings;
ALTER TABLE app_settings_new RENAME TO app_settings;

CREATE TRIGGER IF NOT EXISTS trg_app_settings_updated
AFTER UPDATE ON app_settings FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE app_settings SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
END;

PRAGMA user_version = 2;
