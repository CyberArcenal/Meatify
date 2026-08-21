// src/main/ipc/core/meat/activate_meat.ipc.js
const { MeatStateService } = require("../../../../stateServices/Meat");
const { AppDataSource } = require("../../../db/data-source");

module.exports = async (params, queryRunner) => {
  const { meatId, user = "system" } = params;

  if (!meatId || typeof meatId !== "number") {
    return { status: false, message: "Valid meat ID is required", data: null };
  }

  try {
    const stateService = new MeatStateService(AppDataSource);
    const result = await stateService.activate(meatId, user, queryRunner);
    return {
      status: true,
      message: `Meat #${meatId} activated successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in activateMeat:", error);
    return {
      status: false,
      message: error.message || "Failed to activate meat",
      data: null,
    };
  }
};