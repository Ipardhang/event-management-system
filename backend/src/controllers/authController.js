import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "../config/env.js";

function createToken(userId) {
  return jwt.sign({ userId }, env.jwtSecret, { expiresIn: "7d" });
}

export async function register(req, res) {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) return res.status(409).json({ message: "Email is already registered" });

  const hashedPassword = await bcrypt.hash(password, 12);
  const safeRole = ["organizer", "attendee"].includes(role) ? role : "attendee";
  const user = await User.create({ name, email, password: hashedPassword, role: safeRole });

  res.status(201).json({
    token: createToken(user._id),
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() }).select("+password");

  if (!user || !(await bcrypt.compare(password || "", user.password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  res.json({
    token: createToken(user._id),
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
}

export function currentUser(req, res) {
  res.json({ user: req.user });
}
