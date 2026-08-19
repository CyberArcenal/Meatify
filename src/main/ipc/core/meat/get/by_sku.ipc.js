// src/main/ipc/core/meat/get/by_sku.ipc.js
const meatService = require("../../../../../services/Meat");

module.exports = async (params) => {
  const { sku } = params;

  if (!sku) {
    return { status: false, message: "SKU is required", data: null };
  }

  try {
    // Since findAll supports search, we can use it with exact match
    const options = {
      search: sku,
      limit: 1,
      isActive: true,
    };
    const result = await meatService.findAll(options);
    const meat = result.data.length > 0 ? result.data[0] : null;
    return {
      status: true,
      message: meat ? "Meat retrieved successfully" : "Meat not found",
      data: meat,
    };
  } catch (error) {
    console.error("Error in getMeatBySku:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve meat by SKU",
      data: null,
    };
  }
};