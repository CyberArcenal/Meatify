// src/main/ipc/core/category/get/statistics.ipc.js
const categoryService = require("../../../../../services/CategoryService");

module.exports = async () => {
  try {
    const result = await categoryService.getStatistics();
    return {
      status: true,
      message: "Statistics retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getCategoryStatistics:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve statistics",
      data: null,
    };
  }
};