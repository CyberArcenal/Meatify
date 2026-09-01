// src/main/ipc/core/category/create.ipc.js
//@ts-check
const categoryService = require("../../../../services/Category");

module.exports = async (params, queryRunner) => {
  const { user = "system", ...data } = params;

  if (!data.name) {
    return { status: false, message: "Category name is required", data: null };
  }

  try {
    const result = await categoryService.create(data, user, queryRunner);
    return {
      status: true,
      message: "Category created successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in createCategory:", error);
    return {
      status: false,
      message: error.message || "Failed to create category",
      data: null,
    };
  }
};