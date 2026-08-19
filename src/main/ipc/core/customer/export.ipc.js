// src/main/ipc/core/customer/export.ipc.js
const customerService = require("../../../../services/Customer");

module.exports = async (params) => {
  const { format = "json", filters = {}, user = "system" } = params;

  try {
    const result = await customerService.exportCustomers(format, filters, user);
    return {
      status: true,
      message: "Export completed successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in exportCustomers:", error);
    return {
      status: false,
      message: error.message || "Failed to export customers",
      data: null,
    };
  }
};