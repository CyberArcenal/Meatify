// src/main/ipc/core/category/restore.ipc.js
//@ts-check
const categoryService = require("../../../../services/Category");

module.exports = async (params, queryRunner) => {
  const { id, user = "system" } = params;

  if (!id || typeof id !== "number") {
    return { status: false, message: "Valid category ID is required", data: null };
  }

  try {
    const result = await categoryService.restore(id, user, queryRunner);
    return {
      status: true,
      message: "Category restored successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in restoreCategory:", error);
    return {
      status: false,
      message: error.message || "Failed to restore category",
      data: null,
    };
  }
};