// src/main/ipc/core/meat/get/by_id.ipc.js
const meatService = require("../../../../../services/Meat");

module.exports = async (params) => {
  const { id, includeInactive = false } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid meat ID is required", data: null };
  }

  try {
    const result = await meatService.findById(id, includeInactive);
    return {
      status: true,
      message: "Meat retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getMeatById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve meat",
      data: null,
    };
  }
};