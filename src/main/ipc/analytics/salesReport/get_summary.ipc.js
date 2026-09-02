// src/main/ipc/analytics/salesReport/get_summary.ipc.js
//@ts-check
const { AppDataSource } = require("../../../db/data-source");
const Sale = require("../../../../entities/Sale");
const SaleItem = require("../../../../entities/SaleItem");

module.exports = async (params) => {
  const { period = "month", startDate, endDate } = params || {};

  try {
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      switch (period) {
        case "week":
          start = new Date(now);
          start.setDate(now.getDate() - 7);
          start.setHours(0, 0, 0, 0);
          end = new Date(now);
          end.setHours(23, 59, 59, 999);
          break;
        case "quarter":
          start = new Date(now);
          start.setMonth(now.getMonth() - 3);
          start.setHours(0, 0, 0, 0);
          end = new Date(now);
          end.setHours(23, 59, 59, 999);
          break;
        case "year":
          start = new Date(now);
          start.setFullYear(now.getFullYear() - 1);
          start.setHours(0, 0, 0, 0);
          end = new Date(now);
          end.setHours(23, 59, 59, 999);
          break;
        default: // month
          start = new Date(now);
          start.setMonth(now.getMonth() - 1);
          start.setHours(0, 0, 0, 0);
          end = new Date(now);
          end.setHours(23, 59, 59, 999);
      }
    }

    const saleRepo = AppDataSource.getRepository(Sale);
    const itemRepo = AppDataSource.getRepository(SaleItem);

    // ─── 1. Sales summary ──────────────────────────────────────
    const salesSummary = await saleRepo
      .createQueryBuilder("sale")
      .select([
        "COUNT(sale.id) AS totalTransactions",
        "COALESCE(SUM(sale.totalAmount), 0) AS totalRevenue",
        "COALESCE(SUM(sale.totalDiscount), 0) AS totalDiscounts",
        "COALESCE(AVG(sale.totalAmount), 0) AS averageTicket",
      ])
      .where("sale.status = 'paid'")
      .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
      .getRawOne();

    // ─── 2. Total weight from sale items ──────────────────────
    const weightResult = await itemRepo
      .createQueryBuilder("item")
      .innerJoin("item.sale", "sale")
      .select("COALESCE(SUM(item.weightKg), 0) AS totalWeight")
      .where("sale.status = 'paid'")
      .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
      .getRawOne();

    // ─── 3. Payment method breakdown ──────────────────────────
    const paymentResults = await saleRepo
      .createQueryBuilder("sale")
      .select("sale.paymentMethod", "method")
      .addSelect("COALESCE(SUM(sale.totalAmount), 0) AS total")
      .where("sale.status = 'paid'")
      .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
      .groupBy("sale.paymentMethod")
      .getRawMany();

    const paymentMethods = {};
    paymentResults.forEach(row => {
      paymentMethods[row.method || "unknown"] = parseFloat(row.total) || 0;
    });

    // ─── 4. Top products ──────────────────────────────────────
    const topProducts = await itemRepo
      .createQueryBuilder("item")
      .innerJoin("item.sale", "sale")
      .innerJoin("item.meat", "meat")
      .select("item.meatId", "meatId")
      .addSelect("meat.name", "meatName")
      .addSelect("COALESCE(SUM(item.lineTotal), 0)", "totalRevenue")
      .addSelect("COALESCE(SUM(item.weightKg), 0)", "totalWeight")
      .addSelect("COUNT(item.id)", "count")
      .where("sale.status = 'paid'")
      .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
      .groupBy("item.meatId")
      .orderBy("totalRevenue", "DESC")
      .limit(10)
      .getRawMany();

    // ─── 5. Top customers ─────────────────────────────────────
    const topCustomers = await saleRepo
      .createQueryBuilder("sale")
      .leftJoin("sale.customer", "customer")
      .select("sale.customerId", "customerId")
      .addSelect("COALESCE(customer.name, 'Walk-in')", "customerName")
      .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "totalSpent")
      .addSelect("COUNT(sale.id)", "purchaseCount")
      .where("sale.status = 'paid'")
      .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
      .groupBy("sale.customerId")
      .orderBy("totalSpent", "DESC")
      .limit(10)
      .getRawMany();

    // ─── 6. Daily trend ──────────────────────────────────────
    const dailyTrend = await saleRepo
      .createQueryBuilder("sale")
      .select("DATE(sale.timestamp)", "date")
      .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "revenue")
      .addSelect("COUNT(sale.id)", "count")
      .where("sale.status = 'paid'")
      .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
      .groupBy("DATE(sale.timestamp)")
      .orderBy("date", "ASC")
      .getRawMany();

    // ─── 7. Weekly trend ──────────────────────────────────────
    const weeklyTrend = await saleRepo
      .createQueryBuilder("sale")
      .select("strftime('%Y-W%W', sale.timestamp)", "week")
      .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "revenue")
      .addSelect("COUNT(sale.id)", "count")
      .where("sale.status = 'paid'")
      .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
      .groupBy("strftime('%Y-W%W', sale.timestamp)")
      .orderBy("week", "ASC")
      .getRawMany();

    const totalTransactions = parseInt(salesSummary.totalTransactions, 10) || 0;
    const totalRevenue = parseFloat(salesSummary.totalRevenue) || 0;
    const totalDiscounts = parseFloat(salesSummary.totalDiscounts) || 0;
    const averageTicket = parseFloat(salesSummary.averageTicket) || 0;
    const totalWeight = parseFloat(weightResult.totalWeight) || 0;
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const averageDailyRevenue = totalRevenue / days;

    return {
      status: true,
      message: "Sales report summary retrieved successfully",
      data: {
        period,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        summary: {
          totalRevenue,
          totalTransactions,
          averageTicket,
          totalDiscounts,
          totalWeight,
          averageDailyRevenue,
        },
        paymentMethods,
        topProducts: topProducts.map(row => ({
          meatId: row.meatId,
          meatName: row.meatName || "Unknown",
          totalRevenue: parseFloat(row.totalRevenue) || 0,
          totalWeight: parseFloat(row.totalWeight) || 0,
          count: parseInt(row.count, 10) || 0,
        })),
        topCustomers: topCustomers.map(row => ({
          customerId: row.customerId || "walk-in",
          customerName: row.customerName || "Walk-in",
          totalSpent: parseFloat(row.totalSpent) || 0,
          purchaseCount: parseInt(row.purchaseCount, 10) || 0,
        })),
        trends: {
          daily: dailyTrend.map(row => ({
            date: row.date,
            revenue: parseFloat(row.revenue) || 0,
            count: parseInt(row.count, 10) || 0,
          })),
          weekly: weeklyTrend.map(row => ({
            week: row.week,
            revenue: parseFloat(row.revenue) || 0,
            count: parseInt(row.count, 10) || 0,
          })),
        },
      },
    };
  } catch (error) {
    console.error("Error in getSalesReportSummary:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve sales report summary",
      data: null,
    };
  }
};