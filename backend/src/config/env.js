import "dotenv/config";

const required = (name, fallback) => {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const jwtSecret = required("JWT_SECRET", "local-development-secret-change-me-123456");

if (process.env.NODE_ENV === "production" && jwtSecret.length < 32) {
  throw new Error("Production requires JWT_SECRET to be at least 32 characters");
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  mongoUri: required("MONGODB_URI", "mongodb://127.0.0.1:27017/event_management_system"),
  jwtSecret,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173"
};
