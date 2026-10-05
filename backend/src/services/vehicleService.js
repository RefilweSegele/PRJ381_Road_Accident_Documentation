const pool = require("../config/db");

async function createVehicle(vehicle) {
  const {
    case_id,
    registration_number,
    make,
    model,
    colour,
    vehicle_type
  } = vehicle;

  const result = await pool.query(
    `INSERT INTO vehicles
      (case_id, registration_number, make, model, colour, vehicle_type)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      case_id,
      registration_number,
      make,
      model,
      colour,
      vehicle_type
    ]
  );

  return result.rows[0];
}

async function getVehiclesByCaseId(caseId) {
  const result = await pool.query(
    `SELECT *
     FROM vehicles
     WHERE case_id = $1
     ORDER BY id`,
    [caseId]
  );

  return result.rows;
}

async function getVehicleById(vehicleId) {
  const result = await pool.query(
    `SELECT *
     FROM vehicles
     WHERE id = $1`,
    [vehicleId]
  );

  return result.rows[0];
}

async function updateVehicle(vehicleId, vehicle) {
  const {
    registration_number,
    make,
    model,
    colour,
    vehicle_type
  } = vehicle;

  const result = await pool.query(
    `UPDATE vehicles
     SET registration_number = $1,
         make = $2,
         model = $3,
         colour = $4,
         vehicle_type = $5,
         updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [
      registration_number,
      make,
      model,
      colour,
      vehicle_type,
      vehicleId
    ]
  );

  return result.rows[0];
}

async function deleteVehicle(vehicleId) {
  const result = await pool.query(
    `DELETE FROM vehicles
     WHERE id = $1
     RETURNING *`,
    [vehicleId]
  );

  return result.rows[0];
}

module.exports = {
  createVehicle,
  getVehiclesByCaseId,
  getVehicleById,
  updateVehicle,
  deleteVehicle
};
