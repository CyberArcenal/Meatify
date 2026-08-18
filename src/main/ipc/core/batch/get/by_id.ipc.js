// src/main/ipc/core/batch/get/by_id.ipc.js
const batchService = require("../../../../../services/BatchService");

module.exports = async (params) => {
  const { id, includeDeleted = false } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid batch ID is required", data: null };
  }

  try {
    const result = await batchService.findById(id, includeDeleted);
    return {
      status: true,
      message: "Batch retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getBatchById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve batch",
      data: null,
    };
  }
};