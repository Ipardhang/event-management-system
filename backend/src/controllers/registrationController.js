import crypto from "node:crypto";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";

export async function registerForEvent(req, res) {
  const event = await Event.findOneAndUpdate(
    { _id: req.params.id, status: "approved", availableSeats: { $gt: 0 } },
    { $inc: { availableSeats: -1 } },
    { new: true }
  );

  if (!event) return res.status(400).json({ message: "Event is unavailable or sold out" });

  try {
    const registration = await Registration.create({
      user: req.user._id,
      event: event._id,
      ticketNumber: `EVT-${crypto.randomBytes(5).toString("hex").toUpperCase()}`
    });

    res.status(201).json({ registration });
  } catch (error) {
    await Event.findByIdAndUpdate(event._id, { $inc: { availableSeats: 1 } });
    throw error;
  }
}

export async function myRegistrations(req, res) {
  const registrations = await Registration.find({ user: req.user._id })
    .populate("event")
    .sort({ createdAt: -1 });
  res.json({ registrations });
}

export async function cancelRegistration(req, res) {
  const registration = await Registration.findOne({ _id: req.params.id, user: req.user._id });
  if (!registration) return res.status(404).json({ message: "Registration not found" });
  if (registration.status === "cancelled") return res.status(400).json({ message: "Registration is already cancelled" });

  registration.status = "cancelled";
  await registration.save();
  await Event.findByIdAndUpdate(registration.event, { $inc: { availableSeats: 1 } });

  res.json({ message: "Registration cancelled successfully" });
}
