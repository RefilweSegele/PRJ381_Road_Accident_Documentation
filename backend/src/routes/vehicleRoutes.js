const express = require("express");
const router = express.Router();

const vehicleController = require("../controllers/vehicleController");

// Create a vehicle
router.post("/", vehicleController.createVehicle);

// Get all vehicles belonging to a case
router.get("/case/:caseId", vehicleController.getVehiclesByCaseId);

// Get one vehicle
router.get("/:vehicleId", vehicleController.getVehicleById);

// Update a vehicle
router.put("/:vehicleId", vehicleController.updateVehicle);

// Delete a vehicle
router.delete("/:vehicleId", vehicleController.deleteVehicle);

module.exports = router;
