// src/main/ipc/core/batch/export.ipc.js
const batchService = require("../../../../services/BatchService");

module.exports = async (params) => {
  const { format = "json", filters = {}, user = "system" } = params;

  try {
    const result = await batchService.exportBatches(format, filters, user);
    return {
      status: true,
      message: "Export completed successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in exportBatches:", error);
    return {
      status: false,
      message: error.message || "Failed to export batches",
      data: null,
    };
  }
};