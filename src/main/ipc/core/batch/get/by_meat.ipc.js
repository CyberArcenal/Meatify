// src/main/ipc/core/batch/get/by_meat.ipc.js
const batchService = require("../../../../../services/Batch");

module.exports = async (params) => {
  const { meatId, includeInactive = false } = params;

  if (!meatId || typeof meatId !== "number") {
    return { status: false, message: "Valid meat ID is required", data: null };
  }

  try {
    const options = {
      meatId,
      includeInactive,
      sortBy: "expiryDate",
      sortOrder: "ASC",
    };
    const result = await batchService.findAll(options);
    return {
      status: true,
      message: "Batches retrieved successfully",
       data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
      },
    };
  } catch (error) {
    console.error("Error in getBatchesByMeat:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve batches by meat",
      data: null,
    };
  }
};