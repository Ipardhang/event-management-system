import { Router } from "express";
import {
  createEvent,
  deleteEvent,
  getEvent,
  listEvents,
  listMyEvents,
  updateEvent,
  updateEventStatus
} from "../controllers/eventController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();
router.get("/", listEvents);
router.get("/mine", protect, authorize("organizer", "admin"), listMyEvents);
router.get("/:id", getEvent);
router.post("/", protect, authorize("organizer", "admin"), createEvent);
router.put("/:id", protect, authorize("organizer", "admin"), updateEvent);
router.delete("/:id", protect, authorize("organizer", "admin"), deleteEvent);
router.patch("/:id/status", protect, authorize("admin"), updateEventStatus);

export default router;
