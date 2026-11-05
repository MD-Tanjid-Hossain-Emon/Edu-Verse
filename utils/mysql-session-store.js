const session = require('express-session');

class MysqlSessionStore extends session.Store {
  constructor(db) {
    super();
    this.db = db;
  }

  get(sid, callback) {
    this.db.prepare('SELECT data, expires FROM sessions WHERE sid = ?').get(sid)
      .then(async (record) => {
        if (!record) return callback(null, null);
        if (record.expires <= Date.now()) {
          await this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
          return callback(null, null);
        }
        return callback(null, JSON.parse(record.data));
      })
      .catch(callback);
  }

  set(sid, value, callback = () => {}) {
    const expires = value.cookie?.expires
      ? new Date(value.cookie.expires).getTime()
      : Date.now() + (value.cookie?.maxAge || 24 * 60 * 60 * 1000);
    this.db.prepare(
      `INSERT INTO sessions (sid, expires, data) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)`
    ).run(sid, expires, JSON.stringify(value)).then(() => callback()).catch(callback);
  }

  destroy(sid, callback = () => {}) {
    this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid)
      .then(() => callback())
      .catch(callback);
  }

  touch(sid, value, callback = () => {}) {
    const expires = value.cookie?.expires
      ? new Date(value.cookie.expires).getTime()
      : Date.now() + (value.cookie?.maxAge || 24 * 60 * 60 * 1000);
    this.db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?').run(expires, sid)
      .then(() => callback())
      .catch(callback);
  }
}

module.exports = MysqlSessionStore;
