// src/main/ipc/core/customer/bulk_create.ipc.js
//@ts-check
const customerService = require("../../../../services/Customer");

module.exports = async (params, queryRunner) => {
  const { customersArray, user = "system" } = params;

  if (!Array.isArray(customersArray) || customersArray.length === 0) {
    return {
      status: false,
      message: "customersArray is required and must not be empty",
      data: null,
    };
  }

  try {
    const result = await customerService.bulkCreate(customersArray, user, queryRunner);
    return {
      status: true,
      message: `Bulk create completed. ${result.created.length} created, ${result.errors.length} failed.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in bulkCreateCustomers:", error);
    return {
      status: false,
      message: error.message || "Bulk create failed",
      data: null,
    };
  }
};