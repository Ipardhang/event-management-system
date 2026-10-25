import { Router } from "express";
import { currentUser, login, register, updateProfile } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, currentUser);
router.patch("/me", protect, updateProfile);

export default router;
