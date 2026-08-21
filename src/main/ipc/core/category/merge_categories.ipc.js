// src/main/ipc/core/category/merge_categories.ipc.js
const { CategoryStateService } = require("../../../../stateServices/Category");
const { AppDataSource } = require("../../db/data-source");

module.exports = async (params, queryRunner) => {
  const { sourceCategoryId, targetCategoryId, user = "system" } = params;

  if (!sourceCategoryId || typeof sourceCategoryId !== "number") {
    return { status: false, message: "Valid source category ID is required", data: null };
  }
  if (!targetCategoryId || typeof targetCategoryId !== "number") {
    return { status: false, message: "Valid target category ID is required", data: null };
  }

  try {
    const stateService = new CategoryStateService(AppDataSource);
    const result = await stateService.mergeCategories(
      sourceCategoryId,
      targetCategoryId,
      user,
      queryRunner
    );
    return {
      status: true,
      message: `Category #${sourceCategoryId} merged into #${targetCategoryId} successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in mergeCategories:", error);
    return {
      status: false,
      message: error.message || "Failed to merge categories",
      data: null,
    };
  }
};