const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function mysqlConfig() {
  const connectionUrl = process.env.DATABASE_URL;
  let config;
  if (connectionUrl) {
    const url = new URL(connectionUrl);
    if (url.protocol !== 'mysql:') throw new Error('DATABASE_URL must use the mysql:// scheme.');
    config = {
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.slice(1)),
    };
  } else {
    config = {
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE,
    };
  }

  if (!config.host || !config.user || !config.database) {
    throw new Error('Configure DATABASE_URL or MYSQL_HOST, MYSQL_USER, and MYSQL_DATABASE for MySQL.');
  }
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error('MYSQL_PORT must be a valid TCP port.');
  }
  const connectionLimit = Number(process.env.MYSQL_POOL_SIZE || 10);
  if (!Number.isInteger(connectionLimit) || connectionLimit < 1) {
    throw new Error('MYSQL_POOL_SIZE must be a positive integer.');
  }

  const caPath = process.env.MYSQL_SSL_CA;
  const ssl = process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true, ...(caPath ? { ca: fs.readFileSync(path.resolve(caPath), 'utf8') } : {}) }
    : undefined;

  return {
    ...config,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit,
    queueLimit: 0,
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: false,
    timezone: 'Z',
    ...(ssl ? { ssl } : {}),
  };
}

const pool = mysql.createPool(mysqlConfig());

function normalizeSql(sql) {
  return sql
    .replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\b/gi, 'INSERT IGNORE INTO')
    .replace(/\bdatetime\(\s*'now'\s*\)/gi, 'CURRENT_TIMESTAMP');
}

function createStatement(executor, sql) {
  const normalizedSql = normalizeSql(sql);
  return {
    async get(...params) {
      const [rows] = await executor.execute(normalizedSql, params);
      return rows[0];
    },
    async all(...params) {
      const [rows] = await executor.execute(normalizedSql, params);
      return rows;
    },
    async run(...params) {
      const [result] = await executor.execute(normalizedSql, params);
      return { lastInsertRowid: result.insertId, changes: result.affectedRows };
    },
  };
}

async function initializeSchema() {
  const connection = await pool.getConnection();
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.mysql.sql'), 'utf8');
    for (const statement of schema.split(/;\s*(?:\r?\n|$)/).map((part) => part.trim()).filter(Boolean)) {
      await connection.query(statement);
    }

    const [quizColumns] = await connection.query("SHOW COLUMNS FROM quizzes LIKE 'lesson_id'");
    if (quizColumns.length === 0) {
      await connection.query('ALTER TABLE quizzes ADD COLUMN lesson_id BIGINT UNSIGNED NULL');
    }
    const [questionColumns] = await connection.query("SHOW COLUMNS FROM quiz_questions LIKE 'source'");
    if (questionColumns.length === 0) {
      await connection.query("ALTER TABLE quiz_questions ADD COLUMN source ENUM('instructor', 'sample', 'video-analysis') NOT NULL DEFAULT 'instructor'");
    }

    await connection.query(
      `INSERT INTO quizzes (course_id, lesson_id, title)
       SELECT lessons.course_id, lessons.id, CONCAT('Quiz for ', lessons.title)
       FROM lessons
       LEFT JOIN quizzes ON quizzes.lesson_id = lessons.id
       WHERE quizzes.id IS NULL`
    );
  } finally {
    connection.release();
  }
}

const ready = initializeSchema();

function transaction(callback) {
  return async (...args) => {
    await ready;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const tx = {
        dialect: 'mysql',
        prepare: (sql) => createStatement(connection, sql),
      };
      const result = await callback(tx, ...args);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  };
}

module.exports = {
  dialect: 'mysql',
  ready,
  prepare: (sql) => createStatement(pool, sql),
  transaction,
  exec: async (sql) => {
    await ready;
    await pool.query(sql);
  },
  close: () => pool.end(),
};
