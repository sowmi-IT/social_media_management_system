const express = require("express");
const db = require("../db/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// ---------- List all posts for the logged-in user ----------
router.get("/", (req, res) => {
  const { status } = req.query;
  let rows;
  if (status) {
    rows = db
      .prepare("SELECT * FROM posts WHERE user_id = ? AND status = ? ORDER BY created_at DESC")
      .all(req.user.id, status);
  } else {
    rows = db
      .prepare("SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC")
      .all(req.user.id);
  }
  res.json({ posts: rows });
});

// ---------- Get single post ----------
router.get("/:id", (req, res) => {
  const post = db
    .prepare("SELECT * FROM posts WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);
  if (!post) return res.status(404).json({ error: "Post not found." });
  res.json({ post });
});

// ---------- Create post (draft, publish now, or schedule) ----------
router.post("/", (req, res) => {
  const { title, caption, hashtags, platform, image_name, scheduled_at, publish } = req.body || {};

  if (!title || !caption) {
    return res.status(400).json({ error: "Title and caption are required." });
  }

  let status = "draft";
  if (scheduled_at) status = "scheduled";
  else if (publish) status = "published";

  const info = db
    .prepare(
      `INSERT INTO posts (user_id, title, caption, hashtags, platform, status, scheduled_at, image_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.id,
      title.trim(),
      caption.trim(),
      hashtags || null,
      platform || "General",
      status,
      scheduled_at || null,
      image_name || null
    );

  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ message: "Post saved.", post });
});

// ---------- Update post ----------
router.put("/:id", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM posts WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: "Post not found." });

  const { title, caption, hashtags, platform, image_name, scheduled_at, status } = req.body || {};

  db.prepare(
    `UPDATE posts SET
      title = ?, caption = ?, hashtags = ?, platform = ?, image_name = ?,
      scheduled_at = ?, status = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    title || existing.title,
    caption || existing.caption,
    hashtags !== undefined ? hashtags : existing.hashtags,
    platform || existing.platform,
    image_name !== undefined ? image_name : existing.image_name,
    scheduled_at !== undefined ? scheduled_at : existing.scheduled_at,
    status || existing.status,
    existing.id
  );

  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(existing.id);
  res.json({ message: "Post updated.", post });
});

// ---------- Delete post ----------
router.delete("/:id", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM posts WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: "Post not found." });

  db.prepare("DELETE FROM posts WHERE id = ?").run(existing.id);
  res.json({ message: "Post deleted." });
});

module.exports = router;
