import crypto from "node:crypto";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";

export async function registerForEvent(req, res) {
  const quantity = Number(req.body?.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    return res.status(400).json({ message: "You can book between 1 and 10 tickets" });
  }

  const existingRegistration = await Registration.findOne({ user: req.user._id, event: req.params.id, status: "confirmed" });
  if (existingRegistration) {
    return res.status(409).json({ message: "You already have a confirmed booking for this event" });
  }

  const event = await Event.findOneAndUpdate(
    { _id: req.params.id, status: "approved", availableSeats: { $gte: quantity } },
    { $inc: { availableSeats: -quantity } },
    { new: true }
  );

  if (!event) return res.status(400).json({ message: "Event is unavailable or sold out" });

  try {
    const unitPrice = Number(event.ticketPrice) || 0;
    const subtotal = Number((unitPrice * quantity).toFixed(2));
    const gstAmount = Number((subtotal * 0.18).toFixed(2));
    const totalAmount = Number((subtotal + gstAmount).toFixed(2));
    const registration = await Registration.create({
      user: req.user._id,
      event: event._id,
      ticketNumber: `EVT-${crypto.randomBytes(5).toString("hex").toUpperCase()}`,
      quantity,
      unitPrice,
      subtotal,
      gstAmount,
      totalAmount
    });

    res.status(201).json({ registration, pricing: { quantity, subtotal, gstAmount, totalAmount, gstRate: 18 } });
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
  await Event.findByIdAndUpdate(registration.event, { $inc: { availableSeats: registration.quantity || 1 } });

  res.json({ message: "Registration cancelled successfully" });
}
