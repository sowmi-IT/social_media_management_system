const express = require("express");
const db = require("../db/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/summary", (req, res) => {
  const userId = req.user.id;

  const totals = db
    .prepare(
      `SELECT
        COUNT(*) AS total_posts,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts,
        COALESCE(SUM(views), 0) AS total_views,
        COALESCE(SUM(likes), 0) AS total_likes,
        COALESCE(SUM(comments), 0) AS total_comments
      FROM posts WHERE user_id = ?`
    )
    .get(userId);

  const byPlatform = db
    .prepare(
      `SELECT platform, COUNT(*) AS count FROM posts WHERE user_id = ? GROUP BY platform`
    )
    .all(userId);

  const recent = db
    .prepare(
      `SELECT id, title, status, platform, created_at FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`
    )
    .all(userId);

  res.json({ totals, byPlatform, recent });
});

module.exports = router;
