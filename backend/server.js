const express = require("express");
const cors = require("cors");
require("dotenv").config();

const caseRoutes = require("./src/routes/case.routes");

//Routes for Uploading and Listing Images for a Case
const imageRoutes = require("./src/routes/Image.routes");
const uploadConfig = require("./src/config/upload");
const { uploadErrorHandler } = require("./src/middleware/uploadErrorHandler");


const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test Route (use this to test if the server is running)
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Serves files stored by the local-disk storage driver so the image URLs
// returned by the upload endpoint resolve in dev. Not needed with STORAGE_DRIVER=s3.
app.use("/static/uploads", express.static(uploadConfig.LOCAL_ROOT));

// Case Intake API 
app.use("/api/cases", caseRoutes);

// Image Upload & Storage API (POST /api/cases/:id/upload/images, GET /api/cases/:id/images)
app.use("/api/cases", imageRoutes);

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
