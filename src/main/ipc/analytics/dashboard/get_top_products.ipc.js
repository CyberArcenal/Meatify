// src/main/ipc/dashboard/get_top_products.ipc.js
//@ts-check
const saleItemService = require("../../../../services/SaleItem");
const saleService = require("../../../../services/Sale");

module.exports = async (params) => {
  const { limit = 5, orderBy = "revenue", days = 30 } = params;

  try {
    // Get date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Get all sale items for the period
    const itemsOptions = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 10000,
    };

    const itemsResult = await saleItemService.findAll(itemsOptions);
    const items = itemsResult.data;

    // Group by meat
    const productMap = {};
    items.forEach((item) => {
      const meatId = item.meatId;
      if (!productMap[meatId]) {
        productMap[meatId] = {
          productId: meatId,
          productName: item.meat?.name || "Unknown",
          totalQuantity: 0,
          totalRevenue: 0,
        };
      }
      productMap[meatId].totalQuantity += item.weightKg;
      productMap[meatId].totalRevenue += item.lineTotal;
    });

    // Sort and limit
    const products = Object.values(productMap);
    const sortKey = orderBy === "revenue" ? "totalRevenue" : "totalQuantity";
    const sorted = products.sort((a, b) => b[sortKey] - a[sortKey]);

    const topProducts = sorted.slice(0, limit || 5);

    return {
      status: true,
      message: "Top products retrieved successfully",
      data: topProducts,
    };
  } catch (error) {
    console.error("Error in getTopProducts:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve top products",
      data: [],
    };
  }
};