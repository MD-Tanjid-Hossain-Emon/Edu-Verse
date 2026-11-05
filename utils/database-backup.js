const fs = require('fs/promises');
const path = require('path');

const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = 7;

async function createDatabaseBackup(db, backupDirectory, now = new Date()) {
  await fs.mkdir(backupDirectory, { recursive: true });
  const fileName = `eduverse-${now.toISOString().replace(/[:.]/g, '-')}.db`;
  const backupPath = path.join(backupDirectory, fileName);
  await db.backup(backupPath);

  const backups = (await fs.readdir(backupDirectory))
    .filter((name) => /^eduverse-.*\.db$/.test(name))
    .sort()
    .reverse();
  await Promise.all(backups.slice(RETENTION_DAYS).map((name) => fs.unlink(path.join(backupDirectory, name))));
  return backupPath;
}

function scheduleDatabaseBackups(db, backupDirectory, logger = console) {
  const runBackup = async () => {
    try {
      const backupPath = await createDatabaseBackup(db, backupDirectory);
      logger.info(`Database backup created: ${backupPath}`);
    } catch (error) {
      logger.error('Database backup failed:', error);
    }
  };

  void runBackup();
  const timer = setInterval(runBackup, DAY_MS);
  timer.unref();
  return timer;
}

module.exports = { createDatabaseBackup, scheduleDatabaseBackups };
