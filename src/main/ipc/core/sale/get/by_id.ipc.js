// src/main/ipc/core/sale/get/by_id.ipc.js
const saleService = require("../../../../../services/Sale");

module.exports = async (params) => {
  const { id } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid sale ID is required", data: null };
  }

  try {
    const result = await saleService.findById(id);
    return {
      status: true,
      message: "Sale retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getSaleById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve sale",
      data: null,
    };
  }
};