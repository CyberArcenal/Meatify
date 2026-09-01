// src/main/ipc/core/meat/permanent_delete.ipc.js
//@ts-check
const meatService = require("../../../../services/Meat");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid meat ID is required", data: null };
  }

  try {
    await meatService.permanentlyDelete(id, user, queryRunner);
    return {
      status: true,
      message: "Meat permanently deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in permanentlyDeleteMeat:", error);
    return {
      status: false,
      message: error.message || "Failed to permanently delete meat",
      data: null,
    };
  }
};