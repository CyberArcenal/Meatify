// src/main/ipc/core/saleItem/get/by_meat.ipc.js
const saleItemService = require("../../../../../services/SaleItem");

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
    const result = await saleItemService.findAll(options);
    return {
      status: true,
      message: "Sale items retrieved successfully",
      data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
      },
    };
  } catch (error) {
    console.error("Error in getItemsByMeat:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve sale items by meat",
      data: null,
    };
  }
};