// src/main/ipc/core/meat/bulk_create.ipc.js
const meatService = require("../../../../services/Meat");

module.exports = async (params, queryRunner) => {
  const { meatsArray, user = "system" } = params;

  if (!Array.isArray(meatsArray) || meatsArray.length === 0) {
    return {
      status: false,
      message: "meatsArray is required and must not be empty",
      data: null,
    };
  }

  try {
    const result = await meatService.bulkCreate(meatsArray, user, queryRunner);
    return {
      status: true,
      message: `Bulk create completed. ${result.created.length} created, ${result.errors.length} failed.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in bulkCreateMeats:", error);
    return {
      status: false,
      message: error.message || "Bulk create failed",
      data: null,
    };
  }
};