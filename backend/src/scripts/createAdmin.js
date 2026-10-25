import bcrypt from "bcryptjs";
import { connectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import User from "../models/User.js";

await connectDatabase();

const email = process.env.ADMIN_EMAIL || "admin@evently.local";
const password = process.env.ADMIN_PASSWORD;

if (!password || password.length < 8) {
  throw new Error("Set ADMIN_PASSWORD in .env with at least 8 characters before running the admin seed");
}

const hashedPassword = await bcrypt.hash(password, 12);

const admin = await User.findOneAndUpdate(
  { email },
  { name: "Evently Admin", email, password: hashedPassword, role: "admin" },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

console.log(`Admin ready: ${admin.email}`);
console.log(`Password: ${password}`);
await import("mongoose").then(({ default: mongoose }) => mongoose.disconnect());
