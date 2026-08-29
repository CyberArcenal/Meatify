// src/main/ipc/core/inventoryMovement/get/all.ipc.js
const inventoryMovementService = require("../../../../../services/InventoryMovement");

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
    console.error("Error in getAllMovements:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve inventory movements",
      data: null,
    };
  }
};