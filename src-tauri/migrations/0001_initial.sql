PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS disciplines (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY NOT NULL,
  discipline_id TEXT NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,
  parent_subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);

CREATE TABLE IF NOT EXISTS subject_dependencies (
  id TEXT PRIMARY KEY NOT NULL,
  prerequisite_subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  dependent_subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  strength REAL NOT NULL CHECK(strength IN (1.0,0.7,0.4,0.2)),
  created_at TEXT NOT NULL,
  UNIQUE(prerequisite_subject_id, dependent_subject_id),
  CHECK(prerequisite_subject_id <> dependent_subject_id)
);

CREATE TABLE IF NOT EXISTS notebooks (
  id TEXT PRIMARY KEY NOT NULL,
  discipline_id TEXT NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','completed','blocked')),
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notebook_subjects (
  id TEXT PRIMARY KEY NOT NULL,
  notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  UNIQUE(notebook_id, subject_id)
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  started_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK(duration_minutes > 0),
  discipline_id TEXT NOT NULL REFERENCES disciplines(id),
  notebook_id TEXT REFERENCES notebooks(id) ON DELETE SET NULL,
  source_label TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS session_segments (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  questions INTEGER NOT NULL CHECK(questions > 0),
  correct_answers INTEGER NOT NULL CHECK(correct_answers >= 0 AND correct_answers <= questions),
  difficulty_flags_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS flashcard_concepts (
  id TEXT PRIMARY KEY NOT NULL,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  concept_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  catalog_question TEXT,
  catalog_answer TEXT,
  catalog_version INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);

CREATE TABLE IF NOT EXISTS flashcards (
  id TEXT PRIMARY KEY NOT NULL,
  concept_id TEXT REFERENCES flashcard_concepts(id) ON DELETE SET NULL,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  origin TEXT NOT NULL CHECK(origin IN ('catalog','manual')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
  consecutive_correct INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS flashcard_reviews (
  id TEXT PRIMARY KEY NOT NULL,
  flashcard_id TEXT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  reviewed_at TEXT NOT NULL,
  result TEXT NOT NULL CHECK(result IN ('forgot','slow','remembered')),
  response_time_ms INTEGER NOT NULL CHECK(response_time_ms >= 0)
);

CREATE INDEX IF NOT EXISTS idx_subjects_discipline ON subjects(discipline_id);
CREATE INDEX IF NOT EXISTS idx_segments_subject ON session_segments(subject_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON study_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_flashcards_status ON flashcards(status);
CREATE INDEX IF NOT EXISTS idx_reviews_card_date ON flashcard_reviews(flashcard_id, reviewed_at);

CREATE TABLE IF NOT EXISTS exposures (
  id TEXT PRIMARY KEY NOT NULL,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  session_segment_id TEXT NOT NULL UNIQUE REFERENCES session_segments(id) ON DELETE CASCADE,
  exposure_number INTEGER NOT NULL,
  questions INTEGER NOT NULL CHECK(questions > 0),
  correct_answers INTEGER NOT NULL CHECK(correct_answers >= 0 AND correct_answers <= questions),
  exposed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exposures_subject_date ON exposures(subject_id, exposed_at);
