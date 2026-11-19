import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = Router();
const makeToken = (user) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "8h" });
const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, role: user.role });

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ message: "Name, email and password are required." });
    if (password.length < 10) return res.status(400).json({ message: "Password must contain at least 10 characters." });
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 12), role: "user" });
    res.status(201).json({ token: makeToken(user), user: publicUser(user) });
  } catch (e) { next(e); }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.active || !(await bcrypt.compare(req.body.password || "", user.password)))
      return res.status(401).json({ message: "Invalid email or password." });
    res.json({ token: makeToken(user), user: publicUser(user) });
  } catch (e) { next(e); }
});

router.get("/me", protect, (req, res) => res.json({ user: publicUser(req.user) }));

router.get("/users", protect, adminOnly, async (_req, res, next) => {
  try {
    const users = await User.find().select("name email role active createdAt").sort({ createdAt: -1 });
    res.json(users);
  } catch (e) { next(e); }
});

router.patch("/users/:id/status", protect, adminOnly, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (String(user._id) === String(req.user._id)) return res.status(400).json({ message: "You cannot deactivate your own account." });
    user.active = Boolean(req.body.active);
    await user.save();
    res.json({ message: "User status updated.", active: user.active });
  } catch (e) { next(e); }
});

export default router;
