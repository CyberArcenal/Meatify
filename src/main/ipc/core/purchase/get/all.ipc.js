// src/main/ipc/core/purchase/get/all.ipc.js
const purchaseService = require("../../../../../services/Purchase");

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

    const result = await purchaseService.findAll(options);
    return {
      status: true,
      message: "Purchases retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getAllPurchases:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve purchases",
      data: null,
    };
  }
};