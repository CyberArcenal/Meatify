// src/main/ipc/core/returnRefund/create.ipc.js
//@ts-check
const returnRefundService = require("../../../../services/ReturnRefund");

module.exports = async (params, queryRunner) => {
  const { user = "system", ...data } = params;

  // Validate required fields
  if (!data.saleId) {
    return { status: false, message: "saleId is required", data: null };
  }
  if (!data.customerId) {
    return { status: false, message: "customerId is required", data: null };
  }
  if (!data.refundMethod) {
    return { status: false, message: "refundMethod is required", data: null };
  }
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    return { status: false, message: "At least one return item is required", data: null };
  }

  // Validate each item has required fields
  for (const item of data.items) {
    if (!item.meatId) {
      return { status: false, message: "meatId is required for each item", data: null };
    }
    if (!item.batchId) {
      return { status: false, message: "batchId is required for each item", data: null };
    }
    if (!item.weightKg || item.weightKg <= 0) {
      return { status: false, message: "weightKg must be greater than 0 for each item", data: null };
    }
    if (item.unitPrice === undefined || item.unitPrice === null || item.unitPrice < 0) {
      return { status: false, message: "unitPrice must be non-negative for each item", data: null };
    }
  }

  try {
    const result = await returnRefundService.create(data, user, queryRunner);
    return {
      status: true,
      message: "Return created successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in createReturn:", error);
    return {
      status: false,
      message: error.message || "Failed to create return",
      data: null,
    };
  }
};