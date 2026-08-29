// src/main/ipc/core/inventoryMovement/search.ipc.js
const inventoryMovementService = require("../../../../services/InventoryMovement");

module.exports = async (params) => {
  const { search, page, limit, sortBy, sortOrder, meatId, batchId, saleId, movementType, direction, startDate, endDate, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      meatId,
      batchId,
      saleId,
      movementType,
      direction,
      startDate,
      endDate,
      ...filters,
    };

    const result = await inventoryMovementService.findAll(options);
    return {
      status: true,
      message: "Search completed successfully",
      data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
      },
    };
  } catch (error) {
    console.error("Error in searchMovements:", error);
    return {
      status: false,
      message: error.message || "Search failed",
      data: null,
    };
  }
};