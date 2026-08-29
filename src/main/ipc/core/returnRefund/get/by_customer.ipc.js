// src/main/ipc/core/returnRefund/get/by_customer.ipc.js
const returnRefundService = require("../../../../../services/ReturnRefund");

module.exports = async (params) => {
  const { customerId, status, page, limit } = params;

  if (!customerId || typeof customerId !== "number") {
    return { status: false, message: "Valid customer ID is required", data: null };
  }

  try {
    const options = {
      customerId,
      status,
      page,
      limit,
      sortBy: "createdAt",
      sortOrder: "DESC",
    };
    const result = await returnRefundService.findAll(options);
    return {
      status: true,
      message: "Returns retrieved successfully",
      data: {
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
      },
    };
  } catch (error) {
    console.error("Error in getReturnsByCustomer:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve returns by customer",
      data: null,
    };
  }
};