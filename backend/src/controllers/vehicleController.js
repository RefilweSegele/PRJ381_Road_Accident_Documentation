const vehicleService = require("../services/vehicleService");

async function createVehicle(req, res) {
  try {
    const vehicle = await vehicleService.createVehicle(req.body);

    res.status(201).json({
      message: "Vehicle created successfully",
      vehicle
    });
  } catch (error) {
    console.error("Create vehicle error:", error);

    res.status(500).json({
      message: "Failed to create vehicle",
      error: error.message
    });
  }
}

async function getVehiclesByCaseId(req, res) {
  try {
    const vehicles = await vehicleService.getVehiclesByCaseId(
      req.params.caseId
    );

    res.status(200).json(vehicles);
  } catch (error) {
    console.error("Get vehicles error:", error);

    res.status(500).json({
      message: "Failed to retrieve vehicles",
      error: error.message
    });
  }
}

async function getVehicleById(req, res) {
  try {
    const vehicle = await vehicleService.getVehicleById(
      req.params.vehicleId
    );

    if (!vehicle) {
      return res.status(404).json({
        message: "Vehicle not found"
      });
    }

    res.status(200).json(vehicle);
  } catch (error) {
    console.error("Get vehicle error:", error);

    res.status(500).json({
      message: "Failed to retrieve vehicle",
      error: error.message
    });
  }
}

async function updateVehicle(req, res) {
  try {
    const vehicle = await vehicleService.updateVehicle(
      req.params.vehicleId,
      req.body
    );

    if (!vehicle) {
      return res.status(404).json({
        message: "Vehicle not found"
      });
    }

    res.status(200).json({
      message: "Vehicle updated successfully",
      vehicle
    });
  } catch (error) {
    console.error("Update vehicle error:", error);

    res.status(500).json({
      message: "Failed to update vehicle",
      error: error.message
    });
  }
}

async function deleteVehicle(req, res) {
  try {
    const vehicle = await vehicleService.deleteVehicle(
      req.params.vehicleId
    );

    if (!vehicle) {
      return res.status(404).json({
        message: "Vehicle not found"
      });
    }

    res.status(200).json({
      message: "Vehicle deleted successfully",
      vehicle
    });
  } catch (error) {
    console.error("Delete vehicle error:", error);

    res.status(500).json({
      message: "Vehicle deleted successfully",
      vehicle
    });
  }
}

module.exports = {
  createVehicle,
  getVehiclesByCaseId,
  getVehicleById,
  updateVehicle,
  deleteVehicle
};
