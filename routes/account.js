const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { createAsyncRouter } = require('../utils/async-router');

const router = createAsyncRouter();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const user = await db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(req.session.user.id);
  res.render('account', { title: 'Account settings', user, error: null, success: null });
});

router.post('/', async (req, res, next) => {
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const currentPassword = typeof req.body.current_password === 'string' ? req.body.current_password : '';
  const newPassword = typeof req.body.new_password === 'string' ? req.body.new_password : '';
  const confirmPassword = typeof req.body.confirm_password === 'string' ? req.body.confirm_password : '';

  const renderError = (message) => {
    res.status(400).render('account', {
      title: 'Account settings',
      user: { ...user, name, email },
      error: message,
      success: null,
    });
  };

  if (!name || name.length > 100) return renderError('Name is required and must be 100 characters or fewer.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return renderError('Enter a valid email address.');
  }
  const duplicate = await db.prepare('SELECT 1 FROM users WHERE email = ? AND id != ?').get(email, user.id);
  if (duplicate) return renderError('That email address is already associated with another account.');

  const changingPassword = currentPassword || newPassword || confirmPassword;
  if (changingPassword) {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return renderError('Enter your current password and complete both new-password fields.');
    }
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return renderError('Your current password is incorrect.');
    }
    if (newPassword.length < 10 || newPassword.length > 128) return renderError('Your new password must be between 10 and 128 characters.');
    if (newPassword !== confirmPassword) return renderError('The new passwords do not match.');
  }

  try {
    if (changingPassword) {
      await db.prepare('UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?').run(
        name,
        email,
        bcrypt.hashSync(newPassword, 12),
        user.id
      );
    } else {
      await db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email, user.id);
    }

    req.session.user.name = name;
    req.session.user.email = email;
    return res.render('account', {
      title: 'Account settings',
      user: { ...user, name, email },
      error: null,
      success: 'Your account details have been updated.',
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
