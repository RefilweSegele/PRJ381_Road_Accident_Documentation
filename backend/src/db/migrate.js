// Applies each migration once, recording successful filenames.
// Existing installations: IF NOT EXISTS migrations are still safe to apply.
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");
async function runMigrations() {
  const dir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(dir).filter((name) => name.endsWith(".sql")).sort();
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    for (const file of files) {
      await client.query("BEGIN");
      try {
        const previous = await client.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [file]);
        if (previous.rowCount) {
          await client.query("COMMIT");
          console.log(`Skipping applied migration: ${file}`);
          continue;
        }
        console.log(`Running migration: ${file}`);
        await client.query(fs.readFileSync(path.join(dir, file), "utf8"));
        await client.query("INSERT INTO schema_migrations(filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${error.message}`, { cause: error });
      }
    }
    console.log("All migrations complete.");
  } finally {
    client.release();
    await pool.end();
  }
}
runMigrations().catch((error) => { console.error(error); process.exitCode = 1; });
