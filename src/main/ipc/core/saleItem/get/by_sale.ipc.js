// src/main/ipc/core/saleItem/get/by_sale.ipc.js
const saleItemService = require("../../../../../services/SaleItem");

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
      sortBy: "createdAt",
      sortOrder: "ASC",
    };
    const result = await saleItemService.findAll(options);
    return {
      status: true,
      message: "Sale items retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getItemsBySale:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve sale items by sale",
      data: null,
    };
  }
};