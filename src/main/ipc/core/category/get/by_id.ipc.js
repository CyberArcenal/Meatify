// src/main/ipc/core/category/get/by_id.ipc.js
const categoryService = require("../../../../../services/Category");

module.exports = async (params) => {
  const { id, includeInactive = false } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid category ID is required", data: null };
  }

  try {
    const result = await categoryService.findById(id, includeInactive);
    return {
      status: true,
      message: "Category retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getCategoryById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve category",
      data: null,
    };
  }
};