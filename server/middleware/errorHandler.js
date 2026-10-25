export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  console.error(`[Server Error] [${req.method} ${req.url}] ${err.message}`, err.stack);

  res.status(statusCode).json({
    success: false,
    error: err.message || 'An unexpected internal server error occurred',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Resource not found at ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND'
  });
}
