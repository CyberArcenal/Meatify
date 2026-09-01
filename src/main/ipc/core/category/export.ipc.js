// src/main/ipc/core/category/export.ipc.js
//@ts-check
const categoryService = require("../../../../services/Category");

module.exports = async (params) => {
  const { format = "json", filters = {}, user = "system" } = params;

  try {
    const result = await categoryService.exportCategories(format, filters, user);
    return {
      status: true,
      message: "Export completed successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in exportCategories:", error);
    return {
      status: false,
      message: error.message || "Failed to export categories",
      data: null,
    };
  }
};