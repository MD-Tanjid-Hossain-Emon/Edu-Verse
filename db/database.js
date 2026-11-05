// db/database.js
// Select MySQL for production and retain SQLite for local development/tests.

const DB_DIALECT = process.env.DB_DIALECT || (process.env.NODE_ENV === 'production' ? 'mysql' : 'sqlite');
if (DB_DIALECT === 'mysql') {
  module.exports = require('./database-mysql');
} else {
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.EDUVERSE_DB_PATH
  ? path.resolve(process.env.EDUVERSE_DB_PATH)
  : path.join(__dirname, '..', 'data', 'eduverse.db');
const DB_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.dialect = 'sqlite';
db.ready = Promise.resolve();

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('student','instructor','admin')) DEFAULT 'student',
  status        TEXT NOT NULL CHECK (status IN ('active','suspended')) DEFAULT 'active',
  avatar_color  TEXT DEFAULT '#3D5AFE',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL DEFAULT 'General',
  level         TEXT NOT NULL DEFAULT 'Beginner',
  cover_color   TEXT NOT NULL DEFAULT '#3D5AFE',
  instructor_id INTEGER NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('pending','published','rejected')) DEFAULT 'pending',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lessons (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id   INTEGER NOT NULL,
  title       TEXT NOT NULL,
  video_url   TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enrollments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id   INTEGER NOT NULL,
  course_id    INTEGER NOT NULL,
  enrolled_at  TEXT NOT NULL DEFAULT (datetime('now')),
  certificate_issued INTEGER NOT NULL DEFAULT 0,
  UNIQUE(student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id  INTEGER NOT NULL,
  lesson_id   INTEGER NOT NULL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, lesson_id),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lesson_watches (
  student_id  INTEGER NOT NULL,
  lesson_id   INTEGER NOT NULL,
  watched_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (student_id, lesson_id),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quizzes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id   INTEGER NOT NULL,
  lesson_id   INTEGER,
  title       TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id     INTEGER NOT NULL,
  question    TEXT NOT NULL,
  option_a    TEXT NOT NULL,
  option_b    TEXT NOT NULL,
  option_c    TEXT NOT NULL,
  option_d    TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('a','b','c','d')),
  source      TEXT NOT NULL DEFAULT 'instructor' CHECK (source IN ('instructor', 'sample', 'video-analysis')),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id     INTEGER NOT NULL,
  student_id  INTEGER NOT NULL,
  score       INTEGER NOT NULL,
  total       INTEGER NOT NULL,
  taken_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id   INTEGER NOT NULL,
  title       TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  due_date    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS submissions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL,
  student_id    INTEGER NOT NULL,
  file_name     TEXT NOT NULL,
  stored_name   TEXT NOT NULL,
  submitted_at  TEXT NOT NULL DEFAULT (datetime('now')),
  grade         INTEGER,
  feedback      TEXT,
  UNIQUE(assignment_id, student_id),
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
`);

const quizColumns = db.prepare('PRAGMA table_info(quizzes)').all();
if (!quizColumns.some((column) => column.name === 'lesson_id')) {
  db.exec('ALTER TABLE quizzes ADD COLUMN lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE');
}
const questionColumns = db.prepare('PRAGMA table_info(quiz_questions)').all();
if (!questionColumns.some((column) => column.name === 'source')) {
  db.exec("ALTER TABLE quiz_questions ADD COLUMN source TEXT NOT NULL DEFAULT 'instructor'");
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_quizzes_lesson ON quizzes(lesson_id) WHERE lesson_id IS NOT NULL');
db.prepare(
  `INSERT INTO quizzes (course_id, lesson_id, title)
   SELECT lessons.course_id, lessons.id, 'Quiz for ' || lessons.title
   FROM lessons
   LEFT JOIN quizzes ON quizzes.lesson_id = lessons.id
   WHERE quizzes.id IS NULL`
).run();

module.exports = db;
}
