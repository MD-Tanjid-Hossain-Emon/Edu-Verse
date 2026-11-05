// server.js
// EduVerse — A universe of learning opportunities.
// Entry point: wires up middleware, sessions, view engine, and routes.

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const db = require('./db/database');

const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');
const studentRoutes = require('./routes/student');
const instructorRoutes = require('./routes/instructor');
const adminRoutes = require('./routes/admin');
const accountRoutes = require('./routes/account');
const { scheduleDatabaseBackups } = require('./utils/database-backup');
const MysqlSessionStore = require('./utils/mysql-session-store');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = process.env.EDUVERSE_DATA_DIR
  ? path.resolve(process.env.EDUVERSE_DATA_DIR)
  : path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const UPLOADS_DIR = process.env.EDUVERSE_UPLOADS_DIR
  ? path.resolve(process.env.EDUVERSE_UPLOADS_DIR)
  : path.join(__dirname, 'uploads');
fs.mkdirSync(path.join(UPLOADS_DIR, 'assignments'), { recursive: true });
fs.mkdirSync(path.join(UPLOADS_DIR, 'lessons'), { recursive: true });

const sessionSecret = process.env.SESSION_SECRET;
if (process.env.NODE_ENV === 'production' && !sessionSecret) {
  throw new Error('SESSION_SECRET must be set when NODE_ENV=production.');
}

app.disable('x-powered-by');
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use((req, res, next) => {
  res.locals.currentUser = null;
  res.locals.currentPath = req.path;
  res.locals.csrfToken = '';
  next();
});

app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    store: process.env.NODE_ENV === 'test'
      ? new session.MemoryStore()
      : db.dialect === 'mysql'
        ? new MysqlSessionStore(db)
        : new SQLiteStore({ db: 'sessions.db', dir: DATA_DIR }),
    secret: sessionSecret || 'eduverse-dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

// Make the logged-in user available to every view without passing it manually.
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.currentPath = req.path;
  next();
});

app.use((req, res, next) => {
  res.locals.csrfToken = req.session.csrfToken || '';
  if (req.method === 'GET' && req.path !== '/healthz') {
    req.session.csrfToken ||= crypto.randomBytes(32).toString('hex');
    res.locals.csrfToken = req.session.csrfToken;
    return next();
  }

  if (req.method !== 'POST' || req.path === '/healthz') return next();

  if (req.is('multipart/form-data')) {
    const origin = req.get('origin');
    try {
      if (origin && new URL(origin).host === req.get('host')) return next();
    } catch (error) {
      return res.status(403).render('error', { title: 'Request denied', message: 'This request could not be verified.' });
    }
    return res.status(403).render('error', { title: 'Request denied', message: 'This request could not be verified.' });
  }

  const expected = req.session.csrfToken || '';
  const supplied = req.get('x-csrf-token') || req.body?._csrf || '';
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (!expected || expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) {
    return res.status(403).render('error', { title: 'Request denied', message: 'Refresh the page and try again.' });
  }
  next();
});

app.get('/healthz', async (req, res, next) => {
  try {
    await db.prepare('SELECT 1').get();
    res.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});

app.use('/', authRoutes);
app.use('/', publicRoutes);
app.use('/account', accountRoutes);
app.use('/student', studentRoutes);
app.use('/instructor', instructorRoutes);
app.use('/admin', adminRoutes);

// Convenience: role-agnostic redirect for a stray "/dashboard" link
app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.redirect(`/${req.session.user.role}/dashboard`);
});

app.use((req, res) => {
  res.status(404).render('error', { title: 'Page not found', message: "The page you're looking for doesn't exist." });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'MulterError') {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).render('error', {
      title: 'Upload failed',
      message: err.code === 'LIMIT_FILE_SIZE'
        ? (err.field === 'video' ? 'Course videos must be 500 MB or smaller.' : 'Assignment files must be 15 MB or smaller.')
        : 'The uploaded file could not be accepted.',
    });
  }
  res.status(500).render('error', { title: 'Something went wrong', message: 'An unexpected error occurred. Please try again.' });
});

if (require.main === module) {
  const start = async () => {
    await db.ready;
    const server = app.listen(PORT, () => {
      console.log(`EduVerse is running at http://localhost:${PORT}`);
      if (db.dialect === 'sqlite') scheduleDatabaseBackups(db, path.join(DATA_DIR, 'backups'));
    });
    server.on('error', (error) => {
      console.error('EduVerse failed to start:', error);
      process.exitCode = 1;
    });
  };
  start().catch((error) => {
    console.error('EduVerse failed to start:', error);
    process.exitCode = 1;
  });
}

module.exports = app;
