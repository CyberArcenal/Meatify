// src/main/ipc/core/customer/permanent_delete.ipc.js
//@ts-check
const customerService = require("../../../../services/Customer");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid customer ID is required", data: null };
  }

  try {
    await customerService.permanentlyDelete(id, user, queryRunner);
    return {
      status: true,
      message: "Customer permanently deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in permanentlyDeleteCustomer:", error);
    return {
      status: false,
      message: error.message || "Failed to permanently delete customer",
      data: null,
    };
  }
};