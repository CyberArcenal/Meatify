// src/main/ipc/core/sale/create.ipc.js
const saleService = require("../../../../services/Sale");

module.exports = async (params, queryRunner) => {
  const { user = "system", ...data } = params;

  // Validate required fields
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    return {
      status: false,
      message: "At least one sale item is required",
      data: null,
    };
  }

  // Validate each item has required fields
  for (const item of data.items) {
    if (!item.meatId) {
      return {
        status: false,
        message: "meatId is required for each item",
        data: null,
      };
    }
    if (!item.weightKg || item.weightKg <= 0) {
      return {
        status: false,
        message: "weightKg must be greater than 0 for each item",
        data: null,
      };
    }
    if (
      item.unitPrice === undefined ||
      item.unitPrice === null ||
      item.unitPrice < 0
    ) {
      return {
        status: false,
        message: "unitPrice must be non-negative for each item",
        data: null,
      };
    }

    if (item.batchId !== undefined && item.batchId !== null) {
      if (typeof item.batchId !== "number" || item.batchId <= 0) {
        return {
          status: false,
          message: "batchId must be a positive number",
          data: null,
        };
      }
    }
  }

  try {
    const result = await saleService.create(data, user, queryRunner);
    return {
      status: true,
      message: "Sale created successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in createSale:", error);
    return {
      status: false,
      message: error.message || "Failed to create sale",
      data: null,
    };
  }
};
