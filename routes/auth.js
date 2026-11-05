// routes/auth.js
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { redirectIfAuthenticated } = require('../middleware/auth');
const { clearFailedAttempts, isRateLimited, recordFailedAttempt } = require('../utils/login-rate-limit');
const { createAsyncRouter } = require('../utils/async-router');

const router = createAsyncRouter();

const AVATAR_COLORS = ['#3D5AFE', '#00BFA6', '#F5A623', '#E4572E', '#8E5AF0'];
function randomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

router.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('auth/register', { title: 'Create your account', error: null, old: {} });
});

router.post('/register', redirectIfAuthenticated, async (req, res, next) => {
  const name = typeof req.body.name === 'string' ? req.body.name : '';
  const email = typeof req.body.email === 'string' ? req.body.email : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const confirm_password = typeof req.body.confirm_password === 'string' ? req.body.confirm_password : '';
  const role = typeof req.body.role === 'string' ? req.body.role : '';
  const old = { name, email, role };

  if (!name || !email || !password || !confirm_password) {
    return res.status(400).render('auth/register', { title: 'Create your account', error: 'All fields are required.', old });
  }
  if (!name.trim() || name.trim().length > 100 || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).render('auth/register', { title: 'Create your account', error: 'Enter a name of at most 100 characters and a valid email address.', old });
  }
  if (password.length < 10 || password.length > 128) {
    return res.status(400).render('auth/register', { title: 'Create your account', error: 'Password must be between 10 and 128 characters.', old });
  }
  if (password !== confirm_password) {
    return res.status(400).render('auth/register', { title: 'Create your account', error: 'Passwords do not match.', old });
  }
  const allowedRoles = ['student', 'instructor'];
  const chosenRole = allowedRoles.includes(role) ? role : 'student';

  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(400).render('auth/register', { title: 'Create your account', error: 'An account with that email already exists.', old });
  }

  const hash = bcrypt.hashSync(password, 12);
  const info = await db
    .prepare('INSERT INTO users (name, email, password_hash, role, avatar_color) VALUES (?,?,?,?,?)')
    .run(name.trim(), email.toLowerCase().trim(), hash, chosenRole, randomColor());

  req.session.regenerate((error) => {
    if (error) return next(error);
    req.session.user = { id: info.lastInsertRowid, name: name.trim(), email: email.toLowerCase().trim(), role: chosenRole };
    req.session.save((saveError) => {
      if (saveError) return next(saveError);
      res.redirect(`/${chosenRole}/dashboard`);
    });
  });
});

router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('auth/login', { title: 'Log in', error: null, old: {} });
});

router.post('/login', redirectIfAuthenticated, async (req, res, next) => {
  if (isRateLimited(req, res)) return;

  const email = typeof req.body.email === 'string' ? req.body.email : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    recordFailedAttempt(req);
    return res.status(401).render('auth/login', { title: 'Log in', error: 'Invalid email or password.', old: { email } });
  }
  if (user.status === 'suspended') {
    recordFailedAttempt(req);
    return res.status(403).render('auth/login', { title: 'Log in', error: 'This account has been suspended. Contact an administrator.', old: { email } });
  }

  clearFailedAttempts(req);
  const requestedDest = req.session.returnTo;
  const dest = requestedDest && requestedDest.startsWith('/') && !requestedDest.startsWith('//')
    ? requestedDest
    : `/${user.role}/dashboard`;
  req.session.regenerate((error) => {
    if (error) return next(error);
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    req.session.save((saveError) => {
      if (saveError) return next(saveError);
      res.redirect(dest);
    });
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) return res.status(500).render('error', { title: 'Log out failed', message: 'Your session could not be closed. Please try again.' });
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

module.exports = router;
