export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  console.error(error);

  if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: "A record with these details already exists" });
  }

  const status = error.statusCode || 500;
  res.status(status).json({
    message: status === 500 ? "Internal server error" : error.message
  });
}
