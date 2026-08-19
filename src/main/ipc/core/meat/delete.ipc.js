// src/main/ipc/core/meat/delete.ipc.js
const meatService = require("../../../../services/Meat");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid meat ID is required", data: null };
  }

  try {
    const result = await meatService.delete(id, user, queryRunner);
    return {
      status: true,
      message: "Meat deactivated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in deleteMeat:", error);
    return {
      status: false,
      message: error.message || "Failed to deactivate meat",
      data: null,
    };
  }
};