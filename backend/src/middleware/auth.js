import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = header.slice(7);
  const decoded = jwt.verify(token, env.jwtSecret);
  const user = await User.findById(decoded.userId).select("-password");

  if (!user) return res.status(401).json({ message: "User no longer exists" });

  req.user = user;
  next();
});

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "You do not have permission for this action" });
  }
  next();
};
