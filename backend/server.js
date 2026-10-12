const express = require('express');
const cors = require('cors');
require('dotenv').config();
const casesRouter = require('./ProcessingStatusRouter');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use('/api/cases', casesRouter);

//just to check the server is running
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});