const express = require("express");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

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

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'daias_super_secret_key';

// Middleware
app.use(cors());
app.use(express.json());

// Test Route (use this to test if the server is running)
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Secure File Streaming Endpoint (Replaces public express.static)
// Frontend <img> tags can request files like: /api/uploads/filename.jpg?token=JWT
app.get("/api/uploads/:filename", (req, res) => {
  const token = req.query.token || (req.headers["authorization"] && req.headers["authorization"].split(" ")[1]);

  if (!token) {
    return res.status(401).json({ error: "Access token missing" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    const filename = req.params.filename;
    const safeFilename = path.basename(filename); // Prevent directory traversal attacks
    const filePath = path.join(uploadConfig.LOCAL_ROOT || path.join(__dirname, "uploads"), safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(filePath);
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

// Neo hardware limits the validators enforce (read-only, for the frontend form)
app.get("/api/drone-profile", droneProfile);

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
});
