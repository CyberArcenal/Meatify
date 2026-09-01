// src/main/ipc/core/category/delete.ipc.js
//@ts-check
const categoryService = require("../../../../services/Category");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid category ID is required", data: null };
  }

  try {
    const result = await categoryService.delete(id, user, queryRunner);
    return {
      status: true,
      message: "Category deactivated successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in deleteCategory:", error);
    return {
      status: false,
      message: error.message || "Failed to deactivate category",
      data: null,
    };
  }
};