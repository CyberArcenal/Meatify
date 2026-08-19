// src/main/ipc/core/saleItem/get/all.ipc.js
const saleItemService = require("../../../../../services/SaleItem");

module.exports = async (params) => {
  const { page, limit, sortBy, sortOrder, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      ...filters,
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
    console.error("Error in getAllItems:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve sale items",
      data: null,
    };
  }
};