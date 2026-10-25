import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    category: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    availableSeats: { type: Number, required: true, min: 0 },
    ticketPrice: { type: Number, default: 0, min: 0 },
    image: { type: String, default: "" },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
  },
  { timestamps: true }
);

eventSchema.index({ title: "text", description: "text", category: "text" });

export default mongoose.model("Event", eventSchema);
