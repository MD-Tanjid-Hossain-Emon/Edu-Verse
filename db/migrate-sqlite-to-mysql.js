const fs = require('fs');
const path = require('path');
const SqliteDatabase = require('better-sqlite3');
const mysqlDb = require('./database');

const TABLES = [
  ['users', ['id', 'name', 'email', 'password_hash', 'role', 'status', 'avatar_color', 'created_at']],
  ['courses', ['id', 'title', 'description', 'category', 'level', 'cover_color', 'instructor_id', 'status', 'created_at']],
  ['lessons', ['id', 'course_id', 'title', 'video_url', 'content', 'position', 'created_at']],
  ['enrollments', ['id', 'student_id', 'course_id', 'enrolled_at', 'certificate_issued']],
  ['lesson_progress', ['id', 'student_id', 'lesson_id', 'completed_at']],
  ['lesson_watches', ['student_id', 'lesson_id', 'watched_at']],
  ['quizzes', ['id', 'course_id', 'lesson_id', 'title', 'created_at']],
  ['quiz_questions', ['id', 'quiz_id', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'source']],
  ['quiz_attempts', ['id', 'quiz_id', 'student_id', 'score', 'total', 'taken_at']],
  ['assignments', ['id', 'course_id', 'title', 'instructions', 'due_date', 'created_at']],
  ['submissions', ['id', 'assignment_id', 'student_id', 'file_name', 'stored_name', 'submitted_at', 'grade', 'feedback']],
];
const BATCH_SIZE = 100;

async function main() {
  if (mysqlDb.dialect !== 'mysql') {
    throw new Error('Set DB_DIALECT=mysql before running the SQLite-to-MySQL migration.');
  }

  const sourcePath = path.resolve(
    process.env.EDUVERSE_SOURCE_DB_PATH || path.join(__dirname, '..', 'data', 'eduverse.db')
  );
  if (!fs.existsSync(sourcePath)) throw new Error(`SQLite source database not found: ${sourcePath}`);

  await mysqlDb.ready;
  const source = new SqliteDatabase(sourcePath, { readonly: true, fileMustExist: true });
  try {
    const destinationCounts = await Promise.all(
      TABLES.map(([table]) => mysqlDb.prepare(`SELECT COUNT(*) AS count FROM \`${table}\``).get())
    );
    const sessionCount = await mysqlDb.prepare('SELECT COUNT(*) AS count FROM sessions').get();
    if (destinationCounts.some((row) => row.count > 0) || sessionCount.count > 0) {
      throw new Error('The MySQL destination is not empty. Migration was stopped without changing either database.');
    }

    await mysqlDb.transaction(async (tx) => {
      for (const [table, columns] of TABLES) {
        const rows = source.prepare(`SELECT ${columns.map((column) => `\`${column}\``).join(', ')} FROM \`${table}\``).all();
        const columnSql = columns.map((column) => `\`${column}\``).join(', ');
        for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
          const batch = rows.slice(offset, offset + BATCH_SIZE);
          const rowPlaceholders = `(${columns.map(() => '?').join(', ')})`;
          const valuesSql = batch.map(() => rowPlaceholders).join(', ');
          const values = batch.flatMap((row) => columns.map((column) => row[column]));
          await tx.prepare(`INSERT INTO \`${table}\` (${columnSql}) VALUES ${valuesSql}`).run(...values);
        }
      }
    })();

    console.log(`Migrated ${TABLES.length} tables from ${sourcePath}.`);
    console.log('The SQLite source remains unchanged. Session records are intentionally not migrated.');
  } finally {
    source.close();
  }
}

main()
  .catch((error) => {
    console.error('SQLite-to-MySQL migration failed:', error);
    process.exitCode = 1;
  })
  .finally(() => mysqlDb.close());
