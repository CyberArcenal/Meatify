// src/main/ipc/core/customer/delete.ipc.js
//@ts-check
const customerService = require("../../../../services/Customer");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid customer ID is required", data: null };
  }

  try {
    const result = await customerService.delete(id, user, queryRunner);
    return {
      status: true,
      message: "Customer deactivated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in deleteCustomer:", error);
    return {
      status: false,
      message: error.message || "Failed to deactivate customer",
      data: null,
    };
  }
};