const { Pool } = require("pg");
require("dotenv").config();

// Single shared connection pool — every query in the app reuses this
// instead of opening a new connection per request.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Logs a clear error if the DB is unreachable, instead of failing silently.
pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client", err);
});

module.exports = pool;
