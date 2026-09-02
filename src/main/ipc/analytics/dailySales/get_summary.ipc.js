// src/main/ipc/analytics/dailySales/get_summary.ipc.js
const { AppDataSource } = require("../../../db/data-source");
const Sale = require("../../../../entities/Sale");
const SaleItem = require("../../../../entities/SaleItem");

module.exports = async (params) => {
  const { date } = params || {};

  try {
    const today = date ? new Date(date) : new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    // ─── 1. Today's aggregates ──────────────────────────────
    const saleRepo = AppDataSource.getRepository(Sale);
    const itemRepo = AppDataSource.getRepository(SaleItem);

    const saleAgg = await saleRepo
      .createQueryBuilder("sale")
      .select("COUNT(sale.id)", "totalSales")
      .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "totalRevenue")
      .addSelect("COALESCE(SUM(sale.totalDiscount), 0)", "totalDiscount")
      .where("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
      .andWhere("sale.status = 'paid'")
      .getRawOne();

    const itemAgg = await itemRepo
      .createQueryBuilder("item")
      .leftJoin("item.sale", "sale")
      .select("COALESCE(SUM(item.weightKg), 0)", "totalWeight")
      .where("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
      .andWhere("sale.status = 'paid'")
      .getRawOne();

    const totalSales = parseInt(saleAgg.totalSales, 10) || 0;
    const totalRevenue = parseFloat(saleAgg.totalRevenue) || 0;
    const totalDiscount = parseFloat(saleAgg.totalDiscount) || 0;
    const totalWeight = parseFloat(itemAgg.totalWeight) || 0;
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    // ─── 2. Payment method breakdown ──────────────────────────
    const paymentMethods = await saleRepo
      .createQueryBuilder("sale")
      .select("sale.paymentMethod", "method")
      .addSelect("COUNT(sale.id)", "count")
      .where("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
      .andWhere("sale.status = 'paid'")
      .groupBy("sale.paymentMethod")
      .getRawMany();

    const paymentBreakdown = paymentMethods.reduce((acc, row) => {
      acc[row.method] = parseInt(row.count, 10);
      return acc;
    }, {});

    // ─── 3. Top items (by weight) ─────────────────────────────
    const topItems = await itemRepo
      .createQueryBuilder("item")
      .innerJoin("item.meat", "meat")
      .innerJoin("item.sale", "sale")
      .select("item.meatId", "meatId")
      .addSelect("meat.name", "meatName")
      .addSelect("COALESCE(SUM(item.weightKg), 0)", "totalWeight")
      .addSelect("COALESCE(SUM(item.lineTotal), 0)", "totalRevenue")
      .addSelect("COUNT(item.id)", "count")
      .where("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
      .andWhere("sale.status = 'paid'")
      .groupBy("item.meatId")
      .orderBy("totalWeight", "DESC")
      .limit(5)
      .getRawMany();

    const topItemsFormatted = topItems.map(row => ({
      meatId: row.meatId,
      meatName: row.meatName || "Unknown",
      totalWeight: parseFloat(row.totalWeight) || 0,
      totalRevenue: parseFloat(row.totalRevenue) || 0,
      count: parseInt(row.count, 10) || 0,
    }));

    // ─── 4. Hourly breakdown ──────────────────────────────────
    const hourlyRows = await saleRepo
      .createQueryBuilder("sale")
      .select("strftime('%H', sale.timestamp)", "hour")
      .addSelect("COUNT(sale.id)", "count")
      .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "revenue")
      .where("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
      .andWhere("sale.status = 'paid'")
      .groupBy("strftime('%H', sale.timestamp)")
      .getRawMany();

    const hourlyMap = {};
    for (let i = 0; i < 24; i++) {
      hourlyMap[i] = { count: 0, revenue: 0 };
    }
    hourlyRows.forEach(row => {
      const hour = parseInt(row.hour, 10);
      if (!isNaN(hour) && hour >= 0 && hour < 24) {
        hourlyMap[hour].count = parseInt(row.count, 10) || 0;
        hourlyMap[hour].revenue = parseFloat(row.revenue) || 0;
      }
    });
    const hourlyBreakdown = Object.entries(hourlyMap).map(([hour, data]) => ({
      hour: parseInt(hour),
      ...data,
    }));

    // ─── 5. Compare with yesterday ─────────────────────────────
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStart = new Date(yesterday);
    yStart.setHours(0, 0, 0, 0);
    const yEnd = new Date(yesterday);
    yEnd.setHours(23, 59, 59, 999);

    const yAgg = await saleRepo
      .createQueryBuilder("sale")
      .select("COUNT(sale.id)", "totalSales")
      .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "totalRevenue")
      .where("sale.timestamp >= :yStart AND sale.timestamp <= :yEnd", { yStart, yEnd })
      .andWhere("sale.status = 'paid'")
      .getRawOne();

    const yesterdayRevenue = parseFloat(yAgg.totalRevenue) || 0;
    const yesterdayCount = parseInt(yAgg.totalSales, 10) || 0;

    const revenueChange = yesterdayRevenue > 0
      ? ((totalRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : 0;
    const countChange = yesterdayCount > 0
      ? ((totalSales - yesterdayCount) / yesterdayCount) * 100
      : 0;

    return {
      status: true,
      message: "Daily sales summary retrieved successfully",
      data: {
        date: start.toISOString(),
        totalSales,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalWeight: parseFloat(totalWeight.toFixed(3)),
        totalDiscount: parseFloat(totalDiscount.toFixed(2)),
        averageTicket: parseFloat(averageTicket.toFixed(2)),
        paymentMethods: paymentBreakdown,
        topItems: topItemsFormatted,
        hourlyBreakdown,
        comparison: {
          yesterdayRevenue: parseFloat(yesterdayRevenue.toFixed(2)),
          yesterdayCount,
          revenueChange: parseFloat(revenueChange.toFixed(1)),
          countChange: parseFloat(countChange.toFixed(1)),
        },
        trends: {},
      },
    };
  } catch (error) {
    console.error("Error in getDailySalesSummary:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve daily sales summary",
      data: null,
    };
  }
};