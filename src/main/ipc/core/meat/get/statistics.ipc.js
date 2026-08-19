// src/main/ipc/core/meat/get/statistics.ipc.js
const meatService = require("../../../../../services/Meat");

module.exports = async () => {
  try {
    const result = await meatService.getStatistics();
    return {
      status: true,
      message: "Statistics retrieved successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in getMeatStatistics:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve statistics",
      data: null,
    };
  }
};