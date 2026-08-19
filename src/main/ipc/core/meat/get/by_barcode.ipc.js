// src/main/ipc/core/meat/get/by_barcode.ipc.js
const meatService = require("../../../../../services/Meat");

module.exports = async (params) => {
  const { barcode } = params;

  if (!barcode) {
    return { status: false, message: "Barcode is required", data: null };
  }

  try {
    const options = {
      search: barcode,
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
    console.error("Error in getMeatByBarcode:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve meat by barcode",
      data: null,
    };
  }
};