import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/User.js";
dotenv.config();

if (!process.env.MONGODB_URI || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  console.error("Set MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD in server/.env");
  process.exit(1);
}
await mongoose.connect(process.env.MONGODB_URI);
const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
const existing = await User.findOne({ email });
if (existing) {
  console.log("Admin email already exists. No account changed.");
} else {
  await User.create({
    name: process.env.ADMIN_NAME || "System Administrator",
    email,
    password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
    role: "admin"
  });
  console.log("Administrator account created.");
}
await mongoose.disconnect();
