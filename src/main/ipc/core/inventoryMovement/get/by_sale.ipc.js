// src/main/ipc/core/inventoryMovement/get/by_sale.ipc.js
const inventoryMovementService = require("../../../../../services/InventoryMovement");

module.exports = async (params) => {
  const { saleId, page, limit } = params;

  if (!saleId || typeof saleId !== "number") {
    return { status: false, message: "Valid sale ID is required", data: null };
  }

  try {
    const options = {
      saleId,
      page,
      limit,
      sortBy: "timestamp",
      sortOrder: "DESC",
    };
    const result = await inventoryMovementService.findAll(options);
    return {
      status: true,
      message: "Inventory movements retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getMovementsBySale:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve inventory movements by sale",
      data: null,
    };
  }
};