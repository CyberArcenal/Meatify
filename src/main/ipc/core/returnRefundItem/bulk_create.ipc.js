// src/main/ipc/core/returnRefundItem/bulk_create.ipc.js
const returnRefundItemService = require("../../../../services/ReturnRefundItem");

module.exports = async (params, queryRunner) => {
  const { itemsArray, user = "system" } = params;

  if (!Array.isArray(itemsArray) || itemsArray.length === 0) {
    return {
      status: false,
      message: "itemsArray is required and must not be empty",
      data: null,
    };
  }

  try {
    const result = await returnRefundItemService.bulkCreate(itemsArray, user, queryRunner);
    return {
      status: true,
      message: `Bulk create completed. ${result.created.length} created, ${result.errors.length} failed.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in bulkCreateItems:", error);
    return {
      status: false,
      message: error.message || "Bulk create failed",
      data: null,
    };
  }
};