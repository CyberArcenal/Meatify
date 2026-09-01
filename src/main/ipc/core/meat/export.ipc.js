// src/main/ipc/core/meat/export.ipc.js
//@ts-check
const meatService = require("../../../../services/Meat");

module.exports = async (params) => {
  const { format = "json", filters = {}, user = "system" } = params;

  try {
    const result = await meatService.exportMeats(format, filters, user);
    return {
      status: true,
      message: "Export completed successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in exportMeats:", error);
    return {
      status: false,
      message: error.message || "Failed to export meats",
      data: null,
    };
  }
};