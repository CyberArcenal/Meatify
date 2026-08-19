// src/main/ipc/core/meat/update.ipc.js
const meatService = require("../../../../services/Meat");

module.exports = async (params, queryRunner) => {
  const { id, user = "system", ...data } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid meat ID is required", data: null };
  }

  try {
    const result = await meatService.update(id, data, user, queryRunner);
    return {
      status: true,
      message: "Meat updated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in updateMeat:", error);
    return {
      status: false,
      message: error.message || "Failed to update meat",
      data: null,
    };
  }
};