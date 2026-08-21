// src/main/ipc/analytics/financialReports/get_data.ipc.js
const saleService = require("../../../services/SaleService");
const purchaseService = require("../../../services/PurchaseService");
const returnRefundService = require("../../../services/ReturnRefundService");
const batchService = require("../../../services/BatchService");
const meatService = require("../../../services/MeatService");

module.exports = async (params) => {
  const { 
    startDate,
    endDate,
    groupBy = "day", // day, week, month, quarter, year
    includeCostAnalysis = true,
  } = params;

  try {
    // Determine date range
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      // Default to last 30 days
      start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    // Get sales data
    const salesOptions = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: "paid",
      limit: 10000,
    };
    const salesResult = await saleService.findAll(salesOptions);
    const sales = salesResult.data;

    // Get refunds data
    const refundOptions = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: "processed",
      limit: 10000,
    };
    const refundResult = await returnRefundService.findAll(refundOptions);
    const refunds = refundResult.data;

    // Get purchases data for cost analysis
    let purchases = [];
    let batches = [];
    if (includeCostAnalysis) {
      const purchaseOptions = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        status: "completed",
        limit: 10000,
      };
      const purchaseResult = await purchaseService.findAll(purchaseOptions);
      purchases = purchaseResult.data;

      // Get batches to calculate cost of goods sold
      const batchOptions = {
        limit: 10000,
      };
      const batchResult = await batchService.findAll(batchOptions);
      batches = batchResult.data;
    }

    // Group data by period
    const groupedData = groupFinancialData(sales, refunds, purchases, batches, start, end, groupBy);

    // Calculate profit margins
    const profitMargin = calculateProfitMargin(sales, refunds, purchases, batches);

    // Get top selling products (by revenue)
    const topProducts = getTopProducts(sales);

    // Get revenue breakdown by payment method
    const paymentBreakdown = getPaymentBreakdown(sales);

    // Get daily revenue trend
    const dailyTrend = getDailyTrend(sales, start, end);

    return {
      status: true,
      message: "Financial data retrieved successfully",
      data: {
        groupedData,
        summary: {
          totalRevenue: sales.reduce((sum, s) => sum + s.totalAmount, 0),
          totalRefunds: refunds.reduce((sum, r) => sum + r.totalAmount, 0),
          netRevenue: sales.reduce((sum, s) => sum + s.totalAmount, 0) - refunds.reduce((sum, r) => sum + r.totalAmount, 0),
          totalTransactions: sales.length,
          averageTransaction: sales.length > 0 ? sales.reduce((sum, s) => sum + s.totalAmount, 0) / sales.length : 0,
          totalDiscounts: sales.reduce((sum, s) => sum + s.totalDiscount, 0),
          profitMargin,
          topProducts,
          paymentBreakdown,
          dailyTrend,
          dateRange: {
            start: start.toISOString(),
            end: end.toISOString(),
          },
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

/**
 * Group financial data by period
 */
function groupFinancialData(sales, refunds, purchases, batches, start, end, groupBy) {
  const periods = {};
  
  // Determine grouping function
  const getPeriodKey = (date) => {
    const d = new Date(date);
    switch (groupBy) {
      case "day":
        return d.toISOString().split("T")[0];
      case "week":
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().split("T")[0];
      case "month":
        return d.toISOString().slice(0, 7);
      case "quarter":
        const quarter = Math.floor(d.getMonth() / 3) + 1;
        return `${d.getFullYear()}-Q${quarter}`;
      case "year":
        return `${d.getFullYear()}`;
      default:
        return d.toISOString().split("T")[0];
    }
  };

  // Initialize periods within range
  let current = new Date(start);
  while (current <= end) {
    const key = getPeriodKey(current);
    periods[key] = {
      period: key,
      revenue: 0,
      refunds: 0,
      netRevenue: 0,
      transactions: 0,
      discounts: 0,
      costOfGoods: 0,
      profit: 0,
    };
    current.setDate(current.getDate() + 1);
  }

  // Group sales
  sales.forEach(sale => {
    const key = getPeriodKey(sale.timestamp);
    if (periods[key]) {
      periods[key].revenue += sale.totalAmount;
      periods[key].transactions += 1;
      periods[key].discounts += sale.totalDiscount || 0;
    }
  });

  // Group refunds
  refunds.forEach(refund => {
    const key = getPeriodKey(refund.createdAt);
    if (periods[key]) {
      periods[key].refunds += refund.totalAmount;
    }
  });

  // Calculate net revenue and profit
  Object.keys(periods).forEach(key => {
    periods[key].netRevenue = periods[key].revenue - periods[key].refunds;
    periods[key].profit = periods[key].netRevenue - periods[key].costOfGoods;
  });

  return Object.values(periods).sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Calculate profit margin
 */
function calculateProfitMargin(sales, refunds, purchases, batches) {
  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalRefunds = refunds.reduce((sum, r) => sum + r.totalAmount, 0);
  const netRevenue = totalRevenue - totalRefunds;

  // Calculate cost of goods sold from purchases and batches
  const totalCost = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

  // For a more accurate COGS, we would use batch costs
  // For now, use purchase total as approximation
  const grossProfit = netRevenue - totalCost;
  const profitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalRefunds,
    netRevenue,
    totalCost,
    grossProfit,
    profitMargin,
  };
}

/**
 * Get top selling products by revenue
 */
function getTopProducts(sales) {
  const productMap = {};
  
  sales.forEach(sale => {
    if (sale.saleItems) {
      sale.saleItems.forEach(item => {
        const meatId = item.meatId;
        if (!productMap[meatId]) {
          productMap[meatId] = {
            meatId,
            meatName: item.meat?.name || "Unknown",
            totalRevenue: 0,
            totalWeight: 0,
            count: 0,
          };
        }
        productMap[meatId].totalRevenue += item.lineTotal || 0;
        productMap[meatId].totalWeight += item.weightKg || 0;
        productMap[meatId].count += 1;
      });
    }
  });

  return Object.values(productMap)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);
}

/**
 * Get payment method breakdown
 */
function getPaymentBreakdown(sales) {
  const breakdown = {};
  sales.forEach(sale => {
    const method = sale.paymentMethod || "unknown";
    if (!breakdown[method]) {
      breakdown[method] = {
        count: 0,
        total: 0,
      };
    }
    breakdown[method].count += 1;
    breakdown[method].total += sale.totalAmount;
  });
  return breakdown;
}

/**
 * Get daily revenue trend
 */
function getDailyTrend(sales, start, end) {
  const dailyData = {};
  const current = new Date(start);
  while (current <= end) {
    const key = current.toISOString().split("T")[0];
    dailyData[key] = 0;
    current.setDate(current.getDate() + 1);
  }

  sales.forEach(sale => {
    const key = new Date(sale.timestamp).toISOString().split("T")[0];
    if (dailyData[key] !== undefined) {
      dailyData[key] += sale.totalAmount;
    }
  });

  return Object.entries(dailyData).map(([date, revenue]) => ({
    date,
    revenue,
  }));
}