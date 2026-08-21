// src/main/ipc/core/category/activate_category.ipc.js
const { CategoryStateService } = require("../../../../stateServices/Category");
const { AppDataSource } = require("../../../db/data-source");

module.exports = async (params, queryRunner) => {
  const { categoryId, user = "system" } = params;

  if (!categoryId || typeof categoryId !== "number") {
    return { status: false, message: "Valid category ID is required", data: null };
  }

  try {
    const stateService = new CategoryStateService(AppDataSource);
    const result = await stateService.activate(categoryId, user, queryRunner);
    return {
      status: true,
      message: `Category #${categoryId} activated successfully`,
      data: result,
    };
  } catch (error) {
    console.error("Error in activateCategory:", error);
    return {
      status: false,
      message: error.message || "Failed to activate category",
      data: null,
    };
  }
};