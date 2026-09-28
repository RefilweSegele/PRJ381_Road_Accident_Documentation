const express = require("express");
const cors = require("cors");
require("dotenv").config();

const caseRoutes = require("./src/routes/case.routes");
const authRoutes = require("./src/routes/auth.routes");


const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test Route (use this to test if the server is running)
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Case Intake API 
app.use("/api/cases", caseRoutes);



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
