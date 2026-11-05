const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, test } = require('node:test');
const Database = require('better-sqlite3');
const { listCcnaVideos } = require('../utils/ccna-videos');
const { createDatabaseBackup } = require('../utils/database-backup');
const { createSampleQuestions } = require('../utils/sample-lesson-questions');

const temporaryDirectories = [];

function createTemporaryDirectory() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eduverse-utils-test-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('local video inventory is naturally sorted and uses clean file names as lesson titles', () => {
  const directory = createTemporaryDirectory();
  fs.writeFileSync(path.join(directory, '10 - Ten.mp4'), '');
  fs.writeFileSync(path.join(directory, '2 - Two.mp4'), '');
  fs.writeFileSync(path.join(directory, 'notes.txt'), '');

  assert.deepEqual(listCcnaVideos(directory), [
    { relativePath: '2 - Two.mp4', title: 'Two' },
    { relativePath: '10 - Ten.mp4', title: 'Ten' },
  ]);
});

test('lesson sample question banks contain 20 topic-labelled multiple-choice questions', () => {
  const questions = createSampleQuestions('Free CCNA ｜ IPv4 Addressing (Part 1) ｜ Day 7 ｜ CCNA 200-301 Complete Course');

  assert.equal(questions.length, 20);
  assert.equal(new Set(questions.map((question) => question.question)).size, 20);
  assert.ok(questions.some((question) => question.options.includes('IPv4 addresses are 32 bits long.')));
  for (const question of questions) {
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options).size, 4);
    assert.ok('abcd'.includes(question.correct_option));
    assert.match(question.question, /IPv4 Addressing/);
  }
});

test('database backups contain data and retain only the seven newest copies', async () => {
  const directory = createTemporaryDirectory();
  const backupDirectory = path.join(directory, 'backups');
  fs.mkdirSync(backupDirectory);
  const db = new Database(':memory:');
  db.exec("CREATE TABLE sample (value TEXT); INSERT INTO sample VALUES ('preserved');");

  try {
    for (let day = 1; day <= 8; day += 1) {
      const timestamp = new Date(Date.UTC(2026, 0, day));
      const name = `eduverse-${timestamp.toISOString().replace(/[:.]/g, '-')}.db`;
      fs.writeFileSync(path.join(backupDirectory, name), 'old backup');
    }

    const backupPath = await createDatabaseBackup(db, backupDirectory, new Date(Date.UTC(2026, 0, 9)));
    const backupDb = new Database(backupPath, { readonly: true });
    try {
      assert.equal(backupDb.prepare('SELECT value FROM sample').get().value, 'preserved');
    } finally {
      backupDb.close();
    }
    assert.equal(fs.readdirSync(backupDirectory).filter((name) => name.endsWith('.db')).length, 7);
  } finally {
    db.close();
  }
});
