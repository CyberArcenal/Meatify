// src/main/ipc/dashboard/get_chart.ipc.js
//@ts-check
const { AppDataSource } = require("../../../db/data-source");
const Sale = require("../../../../entities/Sale");

module.exports = async (params) => {
  const { days = 7 } = params;

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const saleRepo = AppDataSource.getRepository(Sale);

    // Group by date using SQLite DATE function (adjust for other DBs)
    const chartData = await saleRepo
      .createQueryBuilder("sale")
      .select("DATE(sale.timestamp)", "date")
      .addSelect("COUNT(sale.id)", "count")
      .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "revenue")
      .where("sale.status = 'paid'")
      .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start: startDate, end: endDate })
      .groupBy("DATE(sale.timestamp)")
      .orderBy("date", "ASC")
      .getRawMany();

    // Fill missing dates (optional but we can just return what exists)
    return {
      status: true,
      message: "Sales chart data retrieved successfully",
      data: chartData.map(row => ({
        date: row.date,
        revenue: parseFloat(row.revenue) || 0,
        count: parseInt(row.count, 10) || 0,
      })),
    };
  } catch (error) {
    console.error("Error in getSalesChart:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve sales chart data",
      data: [],
    };
  }
};