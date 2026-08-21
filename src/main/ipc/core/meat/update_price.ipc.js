// src/main/ipc/core/meat/update_price.ipc.js
const { MeatStateService } = require("../../../../stateServices/Meat");
const { AppDataSource } = require("../../db/data-source");

module.exports = async (params, queryRunner) => {
  const { meatId, newPrice, user = "system" } = params;

  if (!meatId || typeof meatId !== "number") {
    return { status: false, message: "Valid meat ID is required", data: null };
  }
  if (newPrice === undefined || newPrice === null || newPrice < 0) {
    return { status: false, message: "Valid price is required", data: null };
  }

  try {
    const stateService = new MeatStateService(AppDataSource);
    const result = await stateService.updatePrice(meatId, newPrice, user, queryRunner);
    return {
      status: true,
      message: `Price for meat #${meatId} updated successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in updateMeatPrice:", error);
    return {
      status: false,
      message: error.message || "Failed to update price",
      data: null,
    };
  }
};