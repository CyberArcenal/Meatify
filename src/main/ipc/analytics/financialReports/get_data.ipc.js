// src/main/ipc/analytics/financialReports/get_data.ipc.js
//@ts-check
const { AppDataSource } = require("../../../db/data-source");
const Sale = require("../../../../entities/Sale");
const Purchase = require("../../../../entities/Purchase");
const ReturnRefund = require("../../../../entities/ReturnRefund");
const SaleItem = require("../../../../entities/SaleItem");

module.exports = async (params) => {
  const { 
    startDate,
    endDate,
    groupBy = "day",
    includeCostAnalysis = true,
  } = params;

  try {
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    // Get grouped financial data using DB aggregation
    const groupedData = await getGroupedFinancialData(start, end, groupBy);

    // Get summary using DB aggregation
    const summary = await getFinancialSummary(start, end, includeCostAnalysis);

    // Get top products using DB aggregation
    const topProducts = await getTopProducts(start, end);

    // Get payment breakdown using DB aggregation
    const paymentBreakdown = await getPaymentBreakdown(start, end);

    // Get daily trend using DB aggregation
    const dailyTrend = await getDailyTrend(start, end);

    // Get profit margin using DB aggregation
    const profitMargin = await getProfitMargin(start, end, includeCostAnalysis);

    return {
      status: true,
      message: "Financial data retrieved successfully",
      data: {
        groupedData,
        summary: {
          ...summary,
          profitMargin,
          topProducts,
          paymentBreakdown,
          dailyTrend,
        },
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    };
  } catch (error) {
    console.error("Error in getFinancialData:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve financial data",
      data: null,
    };
  }
};

// ─── AGGREGATE HELPERS ────────────────────────────────

/**
 * Get grouped financial data by period using DB GROUP BY
 */
async function getGroupedFinancialData(start, end, groupBy) {
  const saleRepo = AppDataSource.getRepository(Sale);
  const refundRepo = AppDataSource.getRepository(ReturnRefund);
  const purchaseRepo = AppDataSource.getRepository(Purchase);

  // Determine SQL grouping expression
  let groupExpr;
  switch (groupBy) {
    case "day":
      groupExpr = "DATE(sale.timestamp)";
      break;
    case "week":
      groupExpr = "strftime('%Y-%W', sale.timestamp)";
      break;
    case "month":
      groupExpr = "strftime('%Y-%m', sale.timestamp)";
      break;
    case "quarter":
      groupExpr = "strftime('%Y', sale.timestamp) || '-Q' || ((strftime('%m', sale.timestamp) + 2) / 3)";
      break;
    case "year":
      groupExpr = "strftime('%Y', sale.timestamp)";
      break;
    default:
      groupExpr = "DATE(sale.timestamp)";
  }

  // 1. Sales grouped by period
  const salesGroup = await saleRepo
    .createQueryBuilder("sale")
    .select(`${groupExpr}`, "period")
    .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "revenue")
    .addSelect("COUNT(sale.id)", "transactions")
    .addSelect("COALESCE(SUM(sale.totalDiscount), 0)", "discounts")
    .where("sale.status = 'paid'")
    .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
    .groupBy(groupExpr)
    .orderBy("period", "ASC")
    .getRawMany();

  // 2. Refunds grouped by period
  const refundGroup = await refundRepo
    .createQueryBuilder("refund")
    .select(`strftime('%Y-%m-%d', refund.createdAt)`, "period")
    .addSelect("COALESCE(SUM(refund.totalAmount), 0)", "refunds")
    .where("refund.status = 'processed'")
    .andWhere("refund.createdAt >= :start AND refund.createdAt <= :end", { start, end })
    .groupBy("strftime('%Y-%m-%d', refund.createdAt)")
    .getRawMany();

  // 3. Purchases grouped by period (for cost)
  const purchaseGroup = await purchaseRepo
    .createQueryBuilder("purchase")
    .select(`strftime('%Y-%m-%d', purchase.createdAt)`, "period")
    .addSelect("COALESCE(SUM(purchase.totalAmount), 0)", "cost")
    .where("purchase.status = 'completed'")
    .andWhere("purchase.createdAt >= :start AND purchase.createdAt <= :end", { start, end })
    .groupBy("strftime('%Y-%m-%d', purchase.createdAt)")
    .getRawMany();

  // Merge into period map
  const periodMap = {};

  salesGroup.forEach(row => {
    periodMap[row.period] = {
      period: row.period,
      revenue: parseFloat(row.revenue) || 0,
      transactions: parseInt(row.transactions, 10) || 0,
      discounts: parseFloat(row.discounts) || 0,
      refunds: 0,
      costOfGoods: 0,
      netRevenue: 0,
      profit: 0,
    };
  });

  refundGroup.forEach(row => {
    if (periodMap[row.period]) {
      periodMap[row.period].refunds = parseFloat(row.refunds) || 0;
    } else {
      periodMap[row.period] = {
        period: row.period,
        revenue: 0,
        transactions: 0,
        discounts: 0,
        refunds: parseFloat(row.refunds) || 0,
        costOfGoods: 0,
        netRevenue: 0,
        profit: 0,
      };
    }
  });

  purchaseGroup.forEach(row => {
    if (periodMap[row.period]) {
      periodMap[row.period].costOfGoods = parseFloat(row.cost) || 0;
    } else {
      periodMap[row.period] = {
        period: row.period,
        revenue: 0,
        transactions: 0,
        discounts: 0,
        refunds: 0,
        costOfGoods: parseFloat(row.cost) || 0,
        netRevenue: 0,
        profit: 0,
      };
    }
  });

  // Calculate derived fields
  Object.values(periodMap).forEach(p => {
    p.netRevenue = p.revenue - p.refunds;
    p.profit = p.netRevenue - p.costOfGoods;
  });

  return Object.values(periodMap).sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Get financial summary using DB aggregation
 */
async function getFinancialSummary(start, end, includeCostAnalysis) {
  const saleRepo = AppDataSource.getRepository(Sale);
  const refundRepo = AppDataSource.getRepository(ReturnRefund);
  const purchaseRepo = AppDataSource.getRepository(Purchase);

  // Sales summary
  const salesSummary = await saleRepo
    .createQueryBuilder("sale")
    .select("COUNT(sale.id)", "count")
    .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "revenue")
    .addSelect("COALESCE(SUM(sale.totalDiscount), 0)", "discounts")
    .where("sale.status = 'paid'")
    .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
    .getRawOne();

  // Refunds summary
  const refundsSummary = await refundRepo
    .createQueryBuilder("refund")
    .select("COALESCE(SUM(refund.totalAmount), 0)", "total")
    .where("refund.status = 'processed'")
    .andWhere("refund.createdAt >= :start AND refund.createdAt <= :end", { start, end })
    .getRawOne();

  let totalCost = 0;
  if (includeCostAnalysis) {
    const costSummary = await purchaseRepo
      .createQueryBuilder("purchase")
      .select("COALESCE(SUM(purchase.totalAmount), 0)", "total")
      .where("purchase.status = 'completed'")
      .andWhere("purchase.createdAt >= :start AND purchase.createdAt <= :end", { start, end })
      .getRawOne();
    totalCost = parseFloat(costSummary.total) || 0;
  }

  const totalSales = parseInt(salesSummary.count, 10) || 0;
  const totalRevenue = parseFloat(salesSummary.revenue) || 0;
  const totalRefunds = parseFloat(refundsSummary.total) || 0;
  const totalDiscounts = parseFloat(salesSummary.discounts) || 0;
  const netRevenue = totalRevenue - totalRefunds;

  return {
    totalRevenue,
    totalRefunds,
    netRevenue,
    totalTransactions: totalSales,
    totalDiscounts,
    averageTransaction: totalSales > 0 ? totalRevenue / totalSales : 0,
    totalCost: includeCostAnalysis ? totalCost : 0,
    grossProfit: includeCostAnalysis ? netRevenue - totalCost : 0,
  };
}

/**
 * Get profit margin using DB aggregation
 */
async function getProfitMargin(start, end, includeCostAnalysis) {
  const saleRepo = AppDataSource.getRepository(Sale);
  const refundRepo = AppDataSource.getRepository(ReturnRefund);

  const revenueResult = await saleRepo
    .createQueryBuilder("sale")
    .select("COALESCE(SUM(sale.totalAmount), 0)", "total")
    .where("sale.status = 'paid'")
    .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
    .getRawOne();

  const refundsResult = await refundRepo
    .createQueryBuilder("refund")
    .select("COALESCE(SUM(refund.totalAmount), 0)", "total")
    .where("refund.status = 'processed'")
    .andWhere("refund.createdAt >= :start AND refund.createdAt <= :end", { start, end })
    .getRawOne();

  const totalRevenue = parseFloat(revenueResult.total) || 0;
  const totalRefunds = parseFloat(refundsResult.total) || 0;
  const netRevenue = totalRevenue - totalRefunds;

  let profitMargin = 0;
  let grossProfit = 0;
  let totalCost = 0;

  if (includeCostAnalysis) {
    const purchaseRepo = AppDataSource.getRepository(Purchase);
    const costResult = await purchaseRepo
      .createQueryBuilder("purchase")
      .select("COALESCE(SUM(purchase.totalAmount), 0)", "total")
      .where("purchase.status = 'completed'")
      .andWhere("purchase.createdAt >= :start AND purchase.createdAt <= :end", { start, end })
      .getRawOne();
    totalCost = parseFloat(costResult.total) || 0;
    grossProfit = netRevenue - totalCost;
    profitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
  }

  return {
    totalRevenue,
    totalRefunds,
    netRevenue,
    totalCost: includeCostAnalysis ? totalCost : 0,
    grossProfit: includeCostAnalysis ? grossProfit : 0,
    profitMargin: includeCostAnalysis ? profitMargin : 0,
  };
}

/**
 * Get top selling products using DB aggregation
 */
async function getTopProducts(start, end) {
  const itemRepo = AppDataSource.getRepository(SaleItem);

  const top = await itemRepo
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

  return top.map(row => ({
    meatId: row.meatId,
    meatName: row.meatName || "Unknown",
    totalRevenue: parseFloat(row.totalRevenue) || 0,
    totalWeight: parseFloat(row.totalWeight) || 0,
    count: parseInt(row.count, 10) || 0,
  }));
}

/**
 * Get payment method breakdown using DB aggregation
 */
async function getPaymentBreakdown(start, end) {
  const saleRepo = AppDataSource.getRepository(Sale);

  const breakdown = await saleRepo
    .createQueryBuilder("sale")
    .select("sale.paymentMethod", "method")
    .addSelect("COUNT(sale.id)", "count")
    .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "total")
    .where("sale.status = 'paid'")
    .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
    .groupBy("sale.paymentMethod")
    .getRawMany();

  const result = {};
  breakdown.forEach(row => {
    result[row.method || "unknown"] = {
      count: parseInt(row.count, 10) || 0,
      total: parseFloat(row.total) || 0,
    };
  });
  return result;
}

/**
 * Get daily revenue trend using DB GROUP BY DATE
 */
async function getDailyTrend(start, end) {
  const saleRepo = AppDataSource.getRepository(Sale);

  const trend = await saleRepo
    .createQueryBuilder("sale")
    .select("DATE(sale.timestamp)", "date")
    .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "revenue")
    .where("sale.status = 'paid'")
    .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
    .groupBy("DATE(sale.timestamp)")
    .orderBy("date", "ASC")
    .getRawMany();

  // Fill missing dates
  const result = [];
  const current = new Date(start);
  const trendMap = {};
  trend.forEach(row => {
    trendMap[row.date] = parseFloat(row.revenue) || 0;
  });

  while (current <= end) {
    const key = current.toISOString().split("T")[0];
    result.push({
      date: key,
      revenue: trendMap[key] || 0,
    });
    current.setDate(current.getDate() + 1);
  }

  return result;
}