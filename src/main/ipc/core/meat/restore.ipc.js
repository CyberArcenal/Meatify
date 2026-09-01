// src/main/ipc/core/meat/restore.ipc.js
//@ts-check
const meatService = require("../../../../services/Meat");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid meat ID is required", data: null };
  }

  try {
    const result = await meatService.restore(id, user, queryRunner);
    return {
      status: true,
      message: "Meat restored successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in restoreMeat:", error);
    return {
      status: false,
      message: error.message || "Failed to restore meat",
      data: null,
    };
  }
};