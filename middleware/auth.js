// middleware/auth.js
// Route guards used across the app. Session-based auth (express-session);
// `req.session.user` holds { id, name, email, role } once logged in.

function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/login');
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).render('error', {
        title: 'Access denied',
        message: "You don't have permission to view this page.",
      });
    }
    next();
  };
}

function redirectIfAuthenticated(req, res, next) {
  if (req.session.user) {
    return res.redirect(`/${req.session.user.role}/dashboard`);
  }
  next();
}

module.exports = { requireAuth, requireRole, redirectIfAuthenticated };
