import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    ticketNumber: { type: String, required: true, unique: true },
    status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" }
  },
  { timestamps: true }
);

registrationSchema.index({ user: 1, event: 1 }, { unique: true });

export default mongoose.model("Registration", registrationSchema);
