// src/main/ipc/core/meat/deactivate_meat.ipc.js
//@ts-check
const meatService = require("../../../../services/Meat");

module.exports = async (params, queryRunner) => {
  const { meatId, user = "system" } = params;

  if (!meatId || typeof meatId !== "number") {
    return { status: false, message: "Valid meat ID is required", data: null };
  }

  try {
    const result = await meatService.deactivate(meatId, user, queryRunner);
    return {
      status: true,
      message: `Meat #${meatId} deactivated successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in deactivateMeat:", error);
    return {
      status: false,
      message: error.message || "Failed to deactivate meat",
      data: null,
    };
  }
};