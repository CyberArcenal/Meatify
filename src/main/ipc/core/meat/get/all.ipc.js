// src/main/ipc/core/meat/get/all.ipc.js
const meatService = require("../../../../../services/Meat");

module.exports = async (params) => {
  const { page, limit, sortBy, sortOrder, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      ...filters,
    };

    const result = await meatService.findAll(options);
    return {
      status: true,
      message: "Meats retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getAllMeats:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve meats",
      data: null,
    };
  }
};