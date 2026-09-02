// src/main/ipc/dashboard/get_top_products.ipc.js
//@ts-check
const { AppDataSource } = require("../../../db/data-source");
const SaleItem = require("../../../../entities/SaleItem");

module.exports = async (params) => {
  const { limit = 5, orderBy = "revenue", days = 30 } = params;

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const saleItemRepo = AppDataSource.getRepository(SaleItem);

    const sortField = orderBy === "revenue" ? "totalRevenue" : "totalQuantity";

    const topProducts = await saleItemRepo
      .createQueryBuilder("item")
      .select("item.meatId", "productId")
      .addSelect("meat.name", "productName")
      .addSelect("COALESCE(SUM(item.weightKg), 0)", "totalQuantity")
      .addSelect("COALESCE(SUM(item.lineTotal), 0)", "totalRevenue")
      .innerJoin("item.meat", "meat")
      .where("item.createdAt >= :start AND item.createdAt <= :end", { start: startDate, end: endDate })
      .groupBy("item.meatId")
      .orderBy(sortField, "DESC")
      .limit(limit)
      .getRawMany();

    return {
      status: true,
      message: "Top products retrieved successfully",
      data: topProducts.map(row => ({
        productId: row.productId,
        productName: row.productName || "Unknown",
        totalQuantity: parseFloat(row.totalQuantity) || 0,
        totalRevenue: parseFloat(row.totalRevenue) || 0,
      })),
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