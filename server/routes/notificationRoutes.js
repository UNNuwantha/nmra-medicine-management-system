import { Router } from "express";
import Medicine from "../models/Medicine.js";
import { protect } from "../middleware/auth.js";
import { getExpiryStatus } from "../utils/expiry.js";

const router = Router();
const EXPIRY_NOTIFICATION_DAYS = 30;

router.get("/", protect, async (req, res, next) => {
  try {
    const records = await Medicine.find().sort({ expiryDate: 1 });
    const notifications = records.map(m => {
      const expiry = getExpiryStatus(m.expiryDate);
      return {
        id: m._id,
        medicineName: m.genericName,
        batchNumber: m.batchNumber,
        expiryDate: m.expiryDate,
        visited: m.visitedBy?.some(x => String(x.user) === String(req.user._id)) || false,
        ...expiry
      };
    }).filter(n => n.daysRemaining <= EXPIRY_NOTIFICATION_DAYS)
      .filter(n => !records.find(m => String(m._id) === String(n.id))?.dismissedBy?.some(x => String(x.user) === String(req.user._id)));
    res.json(notifications);
  } catch (e) { next(e); }
});

router.patch("/:id/visit", protect, async (req, res, next) => {
  try {
    const m = await Medicine.findById(req.params.id);
    if (!m) return res.status(404).json({ message: "Notification not found." });
    const visited = m.visitedBy.find(x => String(x.user) === String(req.user._id));
    if (visited) visited.at = new Date();
    else m.visitedBy.push({ user: req.user._id, at: new Date() });

    const dismissed = m.dismissedBy.find(x => String(x.user) === String(req.user._id));
    if (dismissed) dismissed.at = new Date();
    else m.dismissedBy.push({ user: req.user._id, at: new Date() });
    await m.save();
    res.json({ visited: true });
  } catch (e) { next(e); }
});

router.patch("/:id/dismiss", protect, async (req, res, next) => {
  try {
    const m = await Medicine.findById(req.params.id);
    if (!m) return res.status(404).json({ message: "Notification not found." });
    const existing = m.dismissedBy.find(x => String(x.user) === String(req.user._id));
    if (existing) existing.at = new Date();
    else m.dismissedBy.push({ user: req.user._id, at: new Date() });
    await m.save();
    res.json({ dismissed: true });
  } catch (e) { next(e); }
});

export default router;
