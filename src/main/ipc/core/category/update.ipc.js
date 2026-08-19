// src/main/ipc/core/category/update.ipc.js
const categoryService = require("../../../../services/Category");

module.exports = async (params, queryRunner) => {
  const { id, user = "system", ...data } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid category ID is required", data: null };
  }

  try {
    const result = await categoryService.update(id, data, user, queryRunner);
    return {
      status: true,
      message: "Category updated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in updateCategory:", error);
    return {
      status: false,
      message: error.message || "Failed to update category",
      data: null,
    };
  }
};