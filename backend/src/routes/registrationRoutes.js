import { Router } from "express";
import { cancelRegistration, myRegistrations, registerForEvent } from "../controllers/registrationController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/my", myRegistrations);
router.post("/events/:id", registerForEvent);
router.delete("/:id", cancelRegistration);

export default router;
