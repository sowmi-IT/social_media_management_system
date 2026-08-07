const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../db/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, fullname: user.fullname },
    process.env.JWT_SECRET || "dev_secret_change_me",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function publicUser(u) {
  return {
    id: u.id,
    fullname: u.fullname,
    email: u.email,
    phone: u.phone,
    role: u.role,
    theme: u.theme,
    email_notifications: !!u.email_notifications,
    created_at: u.created_at,
  };
}

// ---------- Register ----------
router.post("/register", (req, res) => {
  const { fullname, email, phone, password, confirmPassword } = req.body || {};

  if (!fullname || !email || !password) {
    return res.status(400).json({ error: "Full name, email and password are required." });
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(
      "INSERT INTO users (fullname, email, phone, password_hash) VALUES (?, ?, ?, ?)"
    )
    .run(fullname.trim(), email.toLowerCase().trim(), phone || null, password_hash);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  const token = signToken(user);

  res.status(201).json({ message: "Registration successful!", token, user: publicUser(user) });
});

// ---------- Login ----------
router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = signToken(user);
  res.json({ message: "Login successful!", token, user: publicUser(user) });
});

// ---------- Forgot password: generate a reset token ----------
// No email service is configured, so the token is returned directly in the
// response and shown on-screen for the user to copy into the reset form.
router.post("/forgot-password", (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email is required." });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim());
  if (!user) {
    // Don't reveal whether the email exists.
    return res.json({ message: "If that email is registered, a reset token has been generated." });
  }

  const token = crypto.randomBytes(16).toString("hex");
  const expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

  db.prepare(
    "INSERT INTO reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)"
  ).run(user.id, token, expires_at);

  res.json({
    message: "Reset token generated. Use it on the reset password screen within 30 minutes.",
    resetToken: token,
  });
});

// ---------- Reset password using token ----------
router.post("/reset-password", (req, res) => {
  const { token, newPassword, confirmPassword } = req.body || {};
  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token and new password are required." });
  }
  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const row = db.prepare("SELECT * FROM reset_tokens WHERE token = ?").get(token);
  if (!row || row.used || new Date(row.expires_at) < new Date()) {
    return res.status(400).json({ error: "Reset token is invalid or has expired." });
  }

  const password_hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(password_hash, row.user_id);
  db.prepare("UPDATE reset_tokens SET used = 1 WHERE id = ?").run(row.id);

  res.json({ message: "Password reset successfully. You can now log in." });
});

// ---------- Current user ----------
router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ user: publicUser(user) });
});

// ---------- Update profile ----------
router.put("/me", requireAuth, (req, res) => {
  const { fullname, email, phone, password } = req.body || {};
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });

  if (email && email.toLowerCase() !== user.email) {
    const clash = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email.toLowerCase(), user.id);
    if (clash) return res.status(409).json({ error: "That email is already in use." });
  }

  const password_hash = password ? bcrypt.hashSync(password, 10) : user.password_hash;

  db.prepare(
    "UPDATE users SET fullname = ?, email = ?, phone = ?, password_hash = ? WHERE id = ?"
  ).run(
    fullname || user.fullname,
    (email || user.email).toLowerCase(),
    phone !== undefined ? phone : user.phone,
    password_hash,
    user.id
  );

  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
  const token = signToken(updated);
  res.json({ message: "Profile updated.", token, user: publicUser(updated) });
});

// ---------- Update settings (theme / notifications) ----------
router.put("/settings", requireAuth, (req, res) => {
  const { theme, email_notifications } = req.body || {};
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });

  db.prepare("UPDATE users SET theme = ?, email_notifications = ? WHERE id = ?").run(
    theme || user.theme,
    email_notifications !== undefined ? (email_notifications ? 1 : 0) : user.email_notifications,
    user.id
  );

  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
  res.json({ message: "Settings saved.", user: publicUser(updated) });
});

module.exports = router;
