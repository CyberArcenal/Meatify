// src/main/ipc/core/meat/create.ipc.js
const meatService = require("../../../../services/Meat");

module.exports = async (params, queryRunner) => {
  const { user = "system", ...data } = params;

  if (!data.name) {
    return { status: false, message: "Meat name is required", data: null };
  }
  if (data.pricePerKg === undefined || data.pricePerKg === null || data.pricePerKg < 0) {
    return { status: false, message: "Valid pricePerKg is required", data: null };
  }

  try {
    const result = await meatService.create(data, user, queryRunner);
    return {
      status: true,
      message: "Meat created successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in createMeat:", error);
    return {
      status: false,
      message: error.message || "Failed to create meat",
      data: null,
    };
  }
};