// Runs migration .sql files in order, ONCE each (tracked in schema_migrations).
// Run with: npm run migrate
//
// Why tracking was added: migrations 012 and 014 contain data-changing UPDATEs
// that used to re-run on every "npm run migrate" and would push cases back to
// 'processed' without a 3D model.
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

// Files sorting before this name were already applied by the old (untracked) runner.
const BASELINE_BEFORE = "015";

async function runMigrations() {
  const dir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  const { rows } = await pool.query("SELECT filename FROM schema_migrations");
  const done = new Set(rows.map((r) => r.filename));

  // Existing database, tracker used for the first time: 001-014 are already in.
  if (done.size === 0) {
    const { rows: probe } = await pool.query("SELECT to_regclass('public.cases') AS t");
    if (probe[0].t) {
      for (const f of files.filter((name) => name < BASELINE_BEFORE)) {
        await pool.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING", [f],
        );
        done.add(f);
      }
      console.log("Existing database detected: marked migrations before 015 as applied.");
    }
  }

  for (const file of files) {
    if (done.has(file)) continue;
    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await pool.query(sql); // multi-statement simple query = one implicit transaction
    await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
  }
  console.log("All migrations complete.");
  await pool.end();
}
runMigrations().catch((error) => { console.error(error); process.exitCode = 1; });
