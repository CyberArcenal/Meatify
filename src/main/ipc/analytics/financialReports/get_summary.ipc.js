// src/main/ipc/analytics/financialReports/get_summary.ipc.js
//@ts-check
const { AppDataSource } = require("../../../db/data-source");
const Sale = require("../../../../entities/Sale");
const Purchase = require("../../../../entities/Purchase");
const ReturnRefund = require("../../../../entities/ReturnRefund");

module.exports = async (params) => {
  const { period = "month" } = params || {};

  try {
    const now = new Date();
    let start, end;

    switch (period) {
      case "today":
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case "week":
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case "month":
        start = new Date(now);
        start.setMonth(now.getMonth() - 1);
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
      default:
        start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
    }

    const saleRepo = AppDataSource.getRepository(Sale);
    const refundRepo = AppDataSource.getRepository(ReturnRefund);
    const purchaseRepo = AppDataSource.getRepository(Purchase);

    // ─── Current period summary ──────────────────────────────

    const salesSummary = await saleRepo
      .createQueryBuilder("sale")
      .select("COUNT(sale.id)", "count")
      .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "revenue")
      .addSelect("COALESCE(SUM(sale.totalDiscount), 0)", "discounts")
      .where("sale.status = 'paid'")
      .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
      .getRawOne();

    const refundsTotal = await refundRepo
      .createQueryBuilder("refund")
      .select("COALESCE(SUM(refund.totalAmount), 0)", "total")
      .where("refund.status = 'processed'")
      .andWhere("refund.createdAt >= :start AND refund.createdAt <= :end", { start, end })
      .getRawOne();

    const purchasesTotal = await purchaseRepo
      .createQueryBuilder("purchase")
      .select("COALESCE(SUM(purchase.totalAmount), 0)", "total")
      .where("purchase.status = 'completed'")
      .andWhere("purchase.createdAt >= :start AND purchase.createdAt <= :end", { start, end })
      .getRawOne();

    const totalRevenue = parseFloat(salesSummary.revenue) || 0;
    const totalRefunds = parseFloat(refundsTotal.total) || 0;
    const totalCost = parseFloat(purchasesTotal.total) || 0;
    const totalTransactions = parseInt(salesSummary.count, 10) || 0;
    const totalDiscounts = parseFloat(salesSummary.discounts) || 0;
    const netRevenue = totalRevenue - totalRefunds;
    const grossProfit = netRevenue - totalCost;
    const profitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
    const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const averageDailyRevenue = days > 0 ? totalRevenue / days : 0;

    // ─── Previous period comparison ──────────────────────────

    const diff = end - start;
    const prevStart = new Date(start);
    prevStart.setTime(prevStart.getTime() - diff);
    const prevEnd = new Date(end);
    prevEnd.setTime(prevEnd.getTime() - diff);

    const prevSales = await saleRepo
      .createQueryBuilder("sale")
      .select("COALESCE(SUM(sale.totalAmount), 0)", "total")
      .where("sale.status = 'paid'")
      .andWhere("sale.timestamp >= :prevStart AND sale.timestamp <= :prevEnd", {
        prevStart,
        prevEnd,
      })
      .getRawOne();

    const previousRevenue = parseFloat(prevSales.total) || 0;
    const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // ─── Payment breakdown ──────────────────────────────────

    const paymentMethods = await saleRepo
      .createQueryBuilder("sale")
      .select("sale.paymentMethod", "method")
      .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "total")
      .where("sale.status = 'paid'")
      .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
      .groupBy("sale.paymentMethod")
      .getRawMany();

    const paymentBreakdown = {};
    paymentMethods.forEach(row => {
      paymentBreakdown[row.method || "unknown"] = parseFloat(row.total) || 0;
    });

    // ─── Return data ────────────────────────────────────────

    return {
      status: true,
      message: "Financial summary retrieved successfully",
      data: {
        period,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        summary: {
          totalRevenue,
          totalRefunds,
          netRevenue,
          totalTransactions,
          totalDiscounts,
          averageTransaction,
          totalCost,
          grossProfit,
          profitMargin,
        },
        comparison: {
          previousRevenue,
          revenueChange,
        },
        averages: {
          averageDailyRevenue,
          days,
        },
        paymentBreakdown,
      },
    };
  } catch (error) {
    console.error("Error in getFinancialSummary:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve financial summary",
      data: null,
    };
  }
};