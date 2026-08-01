/**
 * 404 handler - koi route match na ho to yahan aata hai.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Central error handler - har controller ka next(error) yahan aata hai
 * aur saaf JSON banata hai.
 *
 * SECURITY: production me stack trace kabhi nahi bhejte - usme
 * server ke folder paths hote hain.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode =
    err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || "Server Error";

  // Mongoose: galat ObjectId (jaise "abc123" bheja gaya)
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
  }

  // Mongoose: duplicate key (jaise wohi email dobara)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    message = `${field} already exists`;
  }

  // Mongoose: validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Session expired, please login again";
  }

  // Server errors terminal me log karo (magar user ko detail mat do)
  if (statusCode >= 500) {
    console.error("✗ Server error:", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    // Stack sirf development me
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };
