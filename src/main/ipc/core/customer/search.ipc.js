// src/main/ipc/core/customer/search.ipc.js
const customerService = require("../../../../services/Customer");

module.exports = async (params) => {
  const { search, page, limit, sortBy, sortOrder, isActive, status, minPoints, maxPoints, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      isActive,
      status,
      minPoints,
      maxPoints,
      ...filters,
    };

    const result = await customerService.findAll(options);
    return {
      status: true,
      message: "Search completed successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in searchCustomers:", error);
    return {
      status: false,
      message: error.message || "Search failed",
      data: null,
    };
  }
};