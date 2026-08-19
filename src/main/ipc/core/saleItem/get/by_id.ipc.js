// src/main/ipc/core/saleItem/get/by_id.ipc.js
const saleItemService = require("../../../../../services/SaleItem");

module.exports = async (params) => {
  const { id } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid item ID is required", data: null };
  }

  try {
    const result = await saleItemService.findById(id);
    return {
      status: true,
      message: "Sale item retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getItemById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve sale item",
      data: null,
    };
  }
};