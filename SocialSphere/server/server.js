require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const postsRoutes = require("./routes/posts");
const analyticsRoutes = require("./routes/analytics");

const app = express();

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());

// ---------- API routes ----------
app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/analytics", analyticsRoutes);

// ---------- Health check ----------
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "SocialSphere backend running."
    });
});

// ---------- Serve the frontend ----------
const CLIENT_DIR = path.join(__dirname, "..", "client");

app.use(express.static(CLIENT_DIR));

// Fallback: any unmatched non-API GET request serves home.html
app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(CLIENT_DIR, "home.html"));
});

// ---------- Error handler ----------
app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        error: "Something went wrong on the server."
    });
});

// ---------- Railway / Production Port ----------
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 SocialSphere backend running on port ${PORT}`);
});
