// src/main/ipc/core/customer/restore.ipc.js
//@ts-check
const customerService = require("../../../../services/Customer");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid customer ID is required", data: null };
  }

  try {
    const result = await customerService.restore(id, user, queryRunner);
    return {
      status: true,
      message: "Customer restored successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in restoreCustomer:", error);
    return {
      status: false,
      message: error.message || "Failed to restore customer",
      data: null,
    };
  }
};