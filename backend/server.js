const express = require('express');
const cors = require('cors');
require('dotenv').config();
const casesRouter = require('./ProcessingStatus.routes');
const processingStatusRoutes = require("./src/routes/processingStatus.routes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use('/api/cases', casesRouter);
app.use("/api/cases", processingStatusRoutes);

//just to check the server is running
app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use(uploadErrorHandler);
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});