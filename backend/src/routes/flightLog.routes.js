const express = require("express");
const router = express.Router();
const flightLogController = require("../controllers/flightLogController");
const requireCase = require("../middleware/requireCase");

// Mounted at /api/cases.
router.post("/:id/flight-logs", requireCase, flightLogController.create);
router.get("/:id/flight-logs", requireCase, flightLogController.list);
router.get("/:id/flight-logs/:logId", requireCase, flightLogController.get);
router.put("/:id/flight-logs/:logId", requireCase, flightLogController.update);
router.delete("/:id/flight-logs/:logId", requireCase, flightLogController.remove);

module.exports = router;
