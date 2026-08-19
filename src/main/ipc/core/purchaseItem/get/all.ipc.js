// src/main/ipc/core/purchaseItem/get/all.ipc.js
const purchaseItemService = require("../../../../../services/PurchaseItem");

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

    const result = await purchaseItemService.findAll(options);
    return {
      status: true,
      message: "Purchase items retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getAllItems:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve purchase items",
      data: null,
    };
  }
};