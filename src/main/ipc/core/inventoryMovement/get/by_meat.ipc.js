// src/main/ipc/core/inventoryMovement/get/by_meat.ipc.js
const inventoryMovementService = require("../../../../../services/InventoryMovement");

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
      sortBy: "timestamp",
      sortOrder: "DESC",
    };
    const result = await inventoryMovementService.findAll(options);
    return {
      status: true,
      message: "Inventory movements retrieved successfully",
      data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
      },
    };
  } catch (error) {
    console.error("Error in getMovementsByMeat:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve inventory movements by meat",
      data: null,
    };
  }
};