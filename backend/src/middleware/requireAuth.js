// Reuse the JWT verifier exported by the existing auth routes so Member 9
// does not introduce a second authentication implementation.
const { authenticateToken } = require("../routes/auth.routes");
module.exports = authenticateToken;
