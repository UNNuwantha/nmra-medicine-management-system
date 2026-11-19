import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/authRoutes.js";
import medicineRoutes from "./routes/medicineRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import User from "./models/User.js";

dotenv.config();

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  }
}));
app.use(express.json({ limit: "1mb" }));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

let mongoPromise;
let adminSeedPromise;

async function seedAdministrator() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) return;

  if (!adminSeedPromise) {
    adminSeedPromise = (async () => {
      const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
      const existing = await User.findOne({ email });
      if (existing) return;

      await User.create({
        name: process.env.ADMIN_NAME || "System Administrator",
        email,
        password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
        role: "admin"
      });
      console.log("Administrator account created.");
    })();
  }

  await adminSeedPromise;
}

async function connectDatabase() {
  if (mongoose.connection.readyState !== 1) {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing.");
    if (!mongoPromise) mongoPromise = mongoose.connect(process.env.MONGODB_URI);
    await mongoPromise;
  }
  await seedAdministrator();
}

app.use(async (_req, _res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "Medicine Handling API",
    health: "/api/health"
  });
});
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "Medicine Handling API" }));
app.use("/api/auth", authRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  connectDatabase()
    .then(() => app.listen(PORT, () => console.log(`API running on port ${PORT}`)))
    .catch((error) => {
      console.error("MongoDB connection failed:", error.message);
      process.exit(1);
    });
}

export default app;
