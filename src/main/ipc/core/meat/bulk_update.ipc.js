// src/main/ipc/core/meat/bulk_update.ipc.js
//@ts-check
const meatService = require("../../../../services/Meat");

module.exports = async (params, queryRunner) => {
  const { updatesArray, user = "system" } = params;

  if (!Array.isArray(updatesArray) || updatesArray.length === 0) {
    return {
      status: false,
      message: "updatesArray is required and must not be empty",
      data: null,
    };
  }

  try {
    const result = await meatService.bulkUpdate(updatesArray, user, queryRunner);
    return {
      status: true,
      message: `Bulk update completed. ${result.updated.length} updated, ${result.errors.length} failed.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in bulkUpdateMeats:", error);
    return {
      status: false,
      message: error.message || "Bulk update failed",
      data: null,
    };
  }
};