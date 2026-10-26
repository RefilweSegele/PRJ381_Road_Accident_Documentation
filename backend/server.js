const express = require("express");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const pool = require("./src/config/db");

const caseRoutes = require("./src/routes/case.routes");
const authRoutes = require("./src/routes/auth.routes");
const reviewerRoutes = require("./src/routes/reviewer/routes");

//Routes for Uploading and Listing Images for a Case
const imageRoutes = require("./src/routes/Image.routes");
const uploadConfig = require("./src/config/upload");

// Member 5: GCP import + flight notes
const gcpRoutes = require("./src/routes/gcp.routes");
const flightLogRoutes = require("./src/routes/flightLog.routes");
const { profile: droneProfile } = require("./src/controllers/flightLogController");
const { uploadErrorHandler } = require("./src/middleware/errorHandler");

// Unofficial car-damage detection test endpoint (POST /api/damage/analyze)
const damageRoutes = require("./src/routes/damage.routes");
const processingRoutes = require("./src/routes/processing.routes");
const { resumeInterruptedJobs } = require("./src/services/processingService");

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'daias_super_secret_key';

// Middleware
app.use(cors());
app.use(express.json());

// Test Route (use this to test if the server is running)
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Secure File Streaming Endpoint. The storage key is nested (for example,
// cases/1/images/<uuid>.jpg), so the named wildcard intentionally retains
// each path segment. Files are never exposed with express.static.
app.get("/api/uploads/*storagePath", async (req, res) => {
  const token = req.headers["authorization"] && req.headers["authorization"].split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token missing" });
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    const storageKey = Array.isArray(req.params.storagePath)
      ? req.params.storagePath.join("/")
      : String(req.params.storagePath || "");
    const segments = storageKey.split("/");
    if (!storageKey || segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\\"))) {
      return res.status(400).json({ error: "Invalid upload path" });
    }

    try {
      // Only keys registered as evidence records may be streamed. This keeps
      // arbitrary files beneath LOCAL_ROOT out of reach even for a valid JWT.
      const { rowCount } = await pool.query(
        `SELECT 1 FROM case_images WHERE storage_key = $1
         UNION ALL
         SELECT 1 FROM scene_models WHERE model_key = $1
         LIMIT 1`,
        [storageKey],
      );
      if (rowCount === 0) return res.status(404).json({ error: "Image not found" });

      const storageRoot = uploadConfig.LOCAL_ROOT || path.join(__dirname, "uploads");
      const filePath = path.resolve(storageRoot, ...segments);
      if (!filePath.startsWith(`${path.resolve(storageRoot)}${path.sep}`) || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Image file not found" });
      }

      return res.sendFile(filePath);
    } catch (error) {
      return res.status(500).json({ error: "Could not retrieve image" });
    }
  });
});

// Authentication Routes
app.use("/api/auth", authRoutes.router);

// Case Intake API
app.use("/api/cases", caseRoutes);

// Reviewer search and detail endpoints are grouped under /api/review.
app.use("/api/review", reviewerRoutes);

// Image Upload & Storage API (POST /api/cases/:id/upload/images, GET /api/cases/:id/images)
app.use("/api/cases", imageRoutes);

// GCP import (POST /api/cases/:id/gcps/import, POST|GET|DELETE /api/cases/:id/gcps)
app.use("/api/cases", gcpRoutes);

// Flight notes (POST|GET /api/cases/:id/flight-logs, GET|PUT|DELETE .../:logId)
app.use("/api/cases", flightLogRoutes);
// 3D reconstruction (WebODM) pipeline
app.use("/api/cases", processingRoutes.caseRouter);
app.use("/api/webodm", processingRoutes.webodmRouter);

// Neo hardware limits the validators enforce (read-only, for the frontend form)
app.get("/api/drone-profile", droneProfile);

// Damage detection test (YOLO segmentation)
app.use("/api/damage", damageRoutes);

// Upload errors (multer limits, bad file type, case not found) -> proper
// 400/404/413/415. Must stay BEFORE the generic handler below; it passes
// anything it doesn't recognise on to it.
app.use(uploadErrorHandler);

// Centralized error handler — catches anything passed to next(err)
// from the controllers instead of letting the request hang.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // pick up WebODM jobs that were running when the server last stopped
  resumeInterruptedJobs().catch((e) => console.error("Could not resume jobs:", e));
});