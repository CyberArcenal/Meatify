// src/main/ipc/core/purchaseItem/get/by_meat.ipc.js
const purchaseItemService = require("../../../../../services/PurchaseItem");

module.exports = async (params) => {
  const { meatId, page, limit } = params;

  if (!meatId || typeof meatId !== "number") {
    return { status: false, message: "Valid meat ID is required", data: null };
  }

  try {
    const options = {
      meatId,
      page,
      limit,
      sortBy: "createdAt",
      sortOrder: "DESC",
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
    console.error("Error in getItemsByMeat:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve purchase items by meat",
      data: null,
    };
  }
};