const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");

// Staff OR Admin can access this
router.get("/ping", requireAuth, requireRole("staff", "admin"), (req, res) => {
  res.json({ success: true, message: "Verify access OK", user: req.user });
});

module.exports = router;
