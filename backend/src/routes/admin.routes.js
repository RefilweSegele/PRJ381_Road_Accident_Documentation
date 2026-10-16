const express = require("express");
const controller = require("../controllers/adminController");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));
router.get("/users", controller.listUsers);
router.post("/users", controller.createUser);
router.patch("/users/:userId", controller.updateUser);
router.get("/jobs", controller.listJobs);
module.exports = router;
