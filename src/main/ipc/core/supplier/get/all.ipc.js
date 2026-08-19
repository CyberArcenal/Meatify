// src/main/ipc/core/supplier/get/all.ipc.js
const supplierService = require("../../../../../services/Supplier");

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

    const result = await supplierService.findAll(options);
    return {
      status: true,
      message: "Suppliers retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getAllSuppliers:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve suppliers",
      data: null,
    };
  }
};