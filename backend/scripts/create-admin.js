// One-time local bootstrap. Supply ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD in environment.
require("dotenv").config();
const pool = require("../src/config/db");
const { createUser } = require("../src/services/adminService");
(async () => {
  const { ADMIN_NAME: name, ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
  if (!name || !email || !password) throw new Error("Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD before running");
  const result = await createUser({ name, email, password, role: "admin" });
  console.log(`Admin account created: ${result.email} (id ${result.id})`);
})().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(async () => { await pool.end(); });
