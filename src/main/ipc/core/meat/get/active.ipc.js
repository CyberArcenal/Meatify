// src/main/ipc/core/meat/get/active.ipc.js
const meatService = require("../../../../../services/Meat");

module.exports = async (params) => {
  const { categoryId, search } = params;

  try {
    const options = {
      isActive: true,
      categoryId,
      search,
      sortBy: "name",
      sortOrder: "ASC",
    };
    const result = await meatService.findAll(options);
    return {
      status: true,
      message: "Active meats retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getActiveMeats:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve active meats",
      data: null,
    };
  }
};