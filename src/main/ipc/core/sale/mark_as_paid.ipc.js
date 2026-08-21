// src/main/ipc/core/sale/mark_as_paid.ipc.js
const { SaleStateService } = require("../../../../stateServices/Sale");
const { AppDataSource } = require("../../../db/data-source");

module.exports = async (params, queryRunner) => {
  const { saleId, user = "system" } = params;

  if (!saleId || typeof saleId !== "number") {
    return { status: false, message: "Valid sale ID is required", data: null };
  }

  try {
    const stateService = new SaleStateService(AppDataSource);
    const result = await stateService.markAsPaid(saleId, user, queryRunner);
    return {
      status: true,
      message: `Sale #${saleId} marked as paid successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in markAsPaid:", error);
    return {
      status: false,
      message: error.message || "Failed to mark sale as paid",
      data: null,
    };
  }
};