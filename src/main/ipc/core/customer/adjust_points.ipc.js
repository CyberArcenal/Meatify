// src/main/ipc/core/customer/adjust_points.ipc.js
const { CustomerStateService } = require("../../../../stateServices/Customer");
const { AppDataSource } = require("../../db/data-source");

module.exports = async (params, queryRunner) => {
  const { customerId, pointsChange, reason, user = "system" } = params;

  if (!customerId || typeof customerId !== "number") {
    return { status: false, message: "Valid customer ID is required", data: null };
  }
  if (!pointsChange || pointsChange === 0) {
    return { status: false, message: "pointsChange must be non-zero", data: null };
  }
  if (!reason) {
    return { status: false, message: "reason is required", data: null };
  }

  try {
    const stateService = new CustomerStateService(AppDataSource);
    const result = await stateService.manualAdjustPoints(
      customerId,
      pointsChange,
      reason,
      user,
      queryRunner
    );
    return {
      status: true,
      message: `${Math.abs(pointsChange)} points adjusted for customer #${customerId}`,
      data: {
        customer: result.customer,
        pointsChanged: result.pointsChanged,
      },
    };
  } catch (error) {
    console.error("Error in adjustPoints:", error);
    return {
      status: false,
      message: error.message || "Failed to adjust points",
      data: null,
    };
  }
};