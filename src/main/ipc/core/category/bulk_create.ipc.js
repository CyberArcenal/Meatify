// src/main/ipc/core/category/bulk_create.ipc.js
const categoryService = require("../../../../services/CategoryService");

module.exports = async (params, queryRunner) => {
  const { categoriesArray, user = "system" } = params;

  if (!Array.isArray(categoriesArray) || categoriesArray.length === 0) {
    return {
      status: false,
      message: "categoriesArray is required and must not be empty",
      data: null,
    };
  }

  try {
    const result = await categoryService.bulkCreate(categoriesArray, user, queryRunner);
    return {
      status: true,
      message: `Bulk create completed. ${result.created.length} created, ${result.errors.length} failed.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in bulkCreateCategories:", error);
    return {
      status: false,
      message: error.message || "Bulk create failed",
      data: null,
    };
  }
};