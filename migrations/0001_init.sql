-- Raito Phase 1 schema. Content lives in git; D1 stores learner state only.

CREATE TABLE profile (
  id               TEXT PRIMARY KEY,
  target_level     TEXT NOT NULL DEFAULT 'N4',
  target_exam_date TEXT,
  timezone         TEXT NOT NULL DEFAULT 'Asia/Hong_Kong',
  created_at       TEXT NOT NULL
);

CREATE TABLE attempts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id       TEXT,
  card_type     TEXT,
  correct       INTEGER NOT NULL,
  latency_ms    INTEGER,
  mode          TEXT NOT NULL,
  lesson_id     TEXT,
  session_id    TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX idx_attempts_item ON attempts(item_id, created_at);
CREATE INDEX idx_attempts_mode ON attempts(mode, created_at);

CREATE TABLE review_state (
  item_id        TEXT NOT NULL,
  card_type      TEXT NOT NULL,
  state          TEXT NOT NULL DEFAULT 'new',
  stability      REAL NOT NULL DEFAULT 0,
  difficulty     REAL NOT NULL DEFAULT 0,
  elapsed_days   INTEGER NOT NULL DEFAULT 0,
  scheduled_days INTEGER NOT NULL DEFAULT 0,
  learning_steps INTEGER NOT NULL DEFAULT 0,
  due_at         TEXT NOT NULL,
  reps           INTEGER NOT NULL DEFAULT 0,
  lapses         INTEGER NOT NULL DEFAULT 0,
  last_review    TEXT,
  updated_at     TEXT NOT NULL,
  PRIMARY KEY (item_id, card_type)
);
CREATE INDEX idx_review_due ON review_state(due_at);
CREATE INDEX idx_review_item ON review_state(item_id);

CREATE TABLE lesson_progress (
  lesson_id     TEXT PRIMARY KEY,
  unit_id       TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'lesson',
  status        TEXT NOT NULL,
  score         REAL,
  started_at    TEXT,
  completed_at  TEXT
);

CREATE TABLE conversations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id     TEXT NOT NULL,
  turn_index     INTEGER NOT NULL,
  lesson_id      TEXT NOT NULL,
  role           TEXT NOT NULL,
  content        TEXT NOT NULL,
  model          TEXT,
  prompt_version TEXT,
  created_at     TEXT NOT NULL
);
CREATE INDEX idx_conversations_session ON conversations(session_id, turn_index);

CREATE TABLE settings (
  id            TEXT PRIMARY KEY,
  furigana      TEXT NOT NULL DEFAULT 'all',
  accent        TEXT NOT NULL DEFAULT 'on',
  voice         TEXT NOT NULL DEFAULT 'female',
  speed         REAL NOT NULL DEFAULT 1.0,
  updated_at    TEXT NOT NULL
);

CREATE TABLE daily_stats (
  day             TEXT PRIMARY KEY,
  due_count       INTEGER NOT NULL,
  reviewed_count  INTEGER NOT NULL,
  new_count       INTEGER NOT NULL,
  backlog         INTEGER NOT NULL,
  consolidation   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE flags (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  kind          TEXT NOT NULL,
  ref           TEXT NOT NULL,
  note          TEXT,
  status        TEXT NOT NULL DEFAULT 'open',
  created_at    TEXT NOT NULL,
  resolved_at   TEXT
);

INSERT INTO profile (id, target_level, timezone, created_at)
VALUES ('me', 'N4', 'Asia/Hong_Kong', datetime('now'));

INSERT INTO settings (id, furigana, accent, voice, speed, updated_at)
VALUES ('me', 'all', 'on', 'female', 1.0, datetime('now'));
