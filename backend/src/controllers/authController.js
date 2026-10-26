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
    user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar || "", role: user.role }
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
    user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar || "", role: user.role }
  });
}

export function currentUser(req, res) {
  res.json({ user: req.user });
}

export async function updateProfile(req, res) {
  const { name, email, avatar, currentPassword } = req.body || {};
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) {
    return res.status(400).json({ message: "Name must contain 2 to 80 characters" });
  }
  if (typeof email !== "string" || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ message: "Enter a valid email address" });
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (avatar !== undefined && (typeof avatar !== "string" || avatar.length > 2_000_000 || (avatar && !/^(https?:\/\/|data:image\/(?:png|jpe?g|webp);base64,)/i.test(avatar)))) {
    return res.status(400).json({ message: "Profile photo must be a JPG, PNG, or WEBP image" });
  }
  if (normalizedEmail !== req.user.email) {
    const account = await User.findById(req.user._id).select("+password");
    if (!account || typeof currentPassword !== "string" || !(await bcrypt.compare(currentPassword, account.password))) {
      return res.status(400).json({ message: "Enter your current password to change your email" });
    }
  }
  try {
    const changes = { name: name.trim(), email: normalizedEmail };
    if (typeof avatar === "string") changes.avatar = avatar;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: changes },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ message: "Account not found" });
    return res.json({ user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar || "", role: user.role } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "That email is already registered" });
    throw error;
  }
}
