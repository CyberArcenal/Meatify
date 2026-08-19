// src/main/ipc/core/customer/get/by_id.ipc.js
const customerService = require("../../../../../services/Customer");

module.exports = async (params) => {
  const { id, includeInactive = false } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid customer ID is required", data: null };
  }

  try {
    const result = await customerService.findById(id, includeInactive);
    return {
      status: true,
      message: "Customer retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getCustomerById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve customer",
      data: null,
    };
  }
};