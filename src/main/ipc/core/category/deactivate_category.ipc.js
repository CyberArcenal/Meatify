// src/main/ipc/core/category/deactivate_category.ipc.js
const categoryService = require("../../../../services/Category");  // ✅ CHANGED

module.exports = async (params, queryRunner) => {
  const { categoryId, reassignToCategoryId, user = "system" } = params;

  if (!categoryId || typeof categoryId !== "number") {
    return { status: false, message: "Valid category ID is required", data: null };
  }

  try {
    let result;

    // ✅ If reassignToCategoryId is provided, use mergeCategories
    if (reassignToCategoryId) {
      result = await categoryService.mergeCategories(
        categoryId,
        reassignToCategoryId,
        user,
        queryRunner
      );
    } else {
      // ✅ Otherwise just deactivate (will throw if it has active meats)
      result = await categoryService.updateIsActive(categoryId, false, user, queryRunner);
    }

    return {
      status: true,
      message: `Category #${categoryId} deactivated successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in deactivateCategory:", error);
    return {
      status: false,
      message: error.message || "Failed to deactivate category",
      data: null,
    };
  }
};