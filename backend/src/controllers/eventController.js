import Event from "../models/Event.js";

export async function listEvents(req, res) {
  const { search, category, status = "approved" } = req.query;
  const filter = { status };

  if (category) filter.category = category;
  if (search) filter.$text = { $search: search };

  const events = await Event.find(filter).populate("organizer", "name email").sort({ date: 1 });
  res.json({ events });
}

export async function listMyEvents(req, res) {
  const filter = req.user.role === "admin" ? {} : { organizer: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const events = await Event.find(filter)
    .populate("organizer", "name email")
    .sort({ createdAt: -1 });

  res.json({ events });
}

export async function getEvent(req, res) {
  const event = await Event.findById(req.params.id).populate("organizer", "name email");
  if (!event) return res.status(404).json({ message: "Event not found" });
  res.json({ event });
}

export async function createEvent(req, res) {
  const { title, description, category, date, location, capacity, ticketPrice, image } = req.body || {};

  if (!title || !description || !category || !date || !location || !capacity) {
    return res.status(400).json({ message: "Title, description, category, date, location, and capacity are required" });
  }

  const event = await Event.create({
    title,
    description,
    category,
    date,
    location,
    capacity,
    availableSeats: capacity,
    ticketPrice: ticketPrice || 0,
    image: image || "",
    organizer: req.user._id
  });

  res.status(201).json({ event });
}

export async function updateEvent(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: "Event not found" });

  const isOwner = event.organizer.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    return res.status(403).json({ message: "Only the organizer or an admin can update this event" });
  }

  const allowed = ["title", "description", "category", "date", "location", "capacity", "ticketPrice", "image"];
  for (const field of allowed) {
    if (req.body[field] !== undefined) event[field] = req.body[field];
  }

  await event.save();
  res.json({ event });
}

export async function deleteEvent(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: "Event not found" });

  const isOwner = event.organizer.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    return res.status(403).json({ message: "Only the organizer or an admin can delete this event" });
  }

  await event.deleteOne();
  res.json({ message: "Event deleted successfully" });
}

export async function updateEventStatus(req, res) {
  const event = await Event.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true, runValidators: true }
  );

  if (!event) return res.status(404).json({ message: "Event not found" });
  res.json({ event });
}
