// src/main/ipc/core/category/permanent_delete.ipc.js
const categoryService = require("../../../../services/Category");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid category ID is required", data: null };
  }

  try {
    await categoryService.permanentlyDelete(id, user, queryRunner);
    return {
      status: true,
      message: "Category permanently deleted successfully",
      data: null,
    };
  } catch (error) {
    console.error("Error in permanentlyDeleteCategory:", error);
    return {
      status: false,
      message: error.message || "Failed to permanently delete category",
      data: null,
    };
  }
};