const express = require('express');

function wrapHandler(handler) {
  if (Array.isArray(handler)) return handler.map(wrapHandler);
  if (typeof handler !== 'function') return handler;

  return function handleAsyncRoute(req, res, next) {
    try {
      const result = handler(req, res, next);
      if (result && typeof result.catch === 'function') return result.catch(next);
      return result;
    } catch (error) {
      return next(error);
    }
  };
}

function createAsyncRouter() {
  const router = express.Router();
  for (const method of ['delete', 'get', 'patch', 'post', 'put', 'use']) {
    const register = router[method];
    router[method] = function registerAsyncHandlers(...args) {
      return register.apply(this, args.map(wrapHandler));
    };
  }
  return router;
}

module.exports = { createAsyncRouter };
