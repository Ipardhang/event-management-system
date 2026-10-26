import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    avatar: { type: String, default: "", maxlength: 2000000 },
    role: { type: String, enum: ["admin", "organizer", "attendee"], default: "attendee" }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
