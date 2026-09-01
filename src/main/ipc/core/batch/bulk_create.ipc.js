// src/main/ipc/core/batch/bulk_create.ipc.js
//@ts-check
const batchService = require("../../../../services/Batch");

module.exports = async (params, queryRunner) => {
  const { batchesArray, user = "system" } = params;

  if (!Array.isArray(batchesArray) || batchesArray.length === 0) {
    return { 
      status: false, 
      message: "batchesArray is required and must not be empty", 
      data: null 
    };
  }

  try {
    const result = await batchService.bulkCreate(batchesArray, user, queryRunner);
    return {
      status: true,
      message: `Bulk create completed. ${result.created.length} created, ${result.errors.length} failed.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in bulkCreateBatches:", error);
    return {
      status: false,
      message: error.message || "Bulk create failed",
      data: null,
    };
  }
};