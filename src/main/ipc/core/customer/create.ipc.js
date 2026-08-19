// src/main/ipc/core/customer/create.ipc.js
const customerService = require("../../../../services/Customer");

module.exports = async (params, queryRunner) => {
  const { user = "system", ...data } = params;

  if (!data.name) {
    return { status: false, message: "Customer name is required", data: null };
  }

  try {
    const result = await customerService.create(data, user, queryRunner);
    return {
      status: true,
      message: "Customer created successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in createCustomer:", error);
    return {
      status: false,
      message: error.message || "Failed to create customer",
      data: null,
    };
  }
};