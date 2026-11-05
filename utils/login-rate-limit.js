const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const MAX_TRACKED_ADDRESSES = 20_000;
const attemptsByAddress = new Map();

function requestAddress(req) {
  return String(req.ip || req.socket.remoteAddress || 'unknown');
}

function purgeExpiredAttempts(now = Date.now()) {
  for (const [address, entry] of attemptsByAddress) {
    if (entry.expiresAt <= now) attemptsByAddress.delete(address);
  }
}

const cleanupTimer = setInterval(purgeExpiredAttempts, 60 * 1000);
cleanupTimer.unref();

function isRateLimited(req, res) {
  const now = Date.now();
  const address = requestAddress(req);
  const entry = attemptsByAddress.get(address);

  if (entry && entry.expiresAt > now && entry.count >= MAX_ATTEMPTS) {
    res.set('Retry-After', String(Math.ceil((entry.expiresAt - now) / 1000)));
    res.status(429).render('auth/login', {
      title: 'Log in',
      error: 'Too many unsuccessful login attempts. Please try again later.',
      old: { email: typeof req.body.email === 'string' ? req.body.email : '' },
    });
    return true;
  }

  if (!entry && attemptsByAddress.size >= MAX_TRACKED_ADDRESSES) {
    purgeExpiredAttempts(now);
    if (attemptsByAddress.size >= MAX_TRACKED_ADDRESSES) {
      res.set('Retry-After', '60');
      res.status(429).render('auth/login', {
        title: 'Log in',
        error: 'Login is temporarily busy. Please try again shortly.',
        old: { email: typeof req.body.email === 'string' ? req.body.email : '' },
      });
      return true;
    }
  }

  return false;
}

function recordFailedAttempt(req) {
  const now = Date.now();
  const address = requestAddress(req);
  const entry = attemptsByAddress.get(address);

  if (!entry || entry.expiresAt <= now) {
    attemptsByAddress.set(address, { count: 1, expiresAt: now + WINDOW_MS });
    return;
  }

  entry.count += 1;
}

function clearFailedAttempts(req) {
  attemptsByAddress.delete(requestAddress(req));
}

module.exports = { isRateLimited, recordFailedAttempt, clearFailedAttempts };
