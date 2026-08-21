// src/main/ipc/analytics/financialReports/get_summary.ipc.js
const saleService = require("../../../services/SaleService");
const purchaseService = require("../../../services/PurchaseService");
const returnRefundService = require("../../../services/ReturnRefundService");

module.exports = async (params) => {
  const { period = "month" } = params || {};

  try {
    // Determine date range based on period
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
        // Month by default
        start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
    }

    // Get sales
    const salesOptions = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: "paid",
      limit: 10000,
    };
    const salesResult = await saleService.findAll(salesOptions);
    const sales = salesResult.data;

    // Get refunds
    const refundOptions = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: "processed",
      limit: 10000,
    };
    const refundResult = await returnRefundService.findAll(refundOptions);
    const refunds = refundResult.data;

    // Get purchases for cost analysis
    const purchaseOptions = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: "completed",
      limit: 10000,
    };
    const purchaseResult = await purchaseService.findAll(purchaseOptions);
    const purchases = purchaseResult.data;

    // Calculate key metrics
    const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalRefunds = refunds.reduce((sum, r) => sum + r.totalAmount, 0);
    const netRevenue = totalRevenue - totalRefunds;
    const totalTransactions = sales.length;
    const totalDiscounts = sales.reduce((sum, s) => sum + (s.totalDiscount || 0), 0);
    const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const totalCost = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const grossProfit = netRevenue - totalCost;
    const profitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    // Get previous period for comparison
    const prevStart = new Date(start);
    const prevEnd = new Date(start);
    const diff = end - start;
    prevStart.setTime(prevStart.getTime() - diff);
    prevEnd.setTime(prevEnd.getTime() - diff);

    const prevSalesOptions = {
      startDate: prevStart.toISOString(),
      endDate: prevEnd.toISOString(),
      status: "paid",
      limit: 10000,
    };
    const prevSalesResult = await saleService.findAll(prevSalesOptions);
    const prevRevenue = prevSalesResult.data.reduce((sum, s) => sum + s.totalAmount, 0);

    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Get daily averages
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const averageDailyRevenue = days > 0 ? totalRevenue / days : 0;

    // Payment method breakdown
    const paymentBreakdown = {};
    sales.forEach(s => {
      const method = s.paymentMethod || "unknown";
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + s.totalAmount;
    });

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
          previousRevenue: prevRevenue,
          revenueChange,
        },
        averages: {
          averageDailyRevenue,
          days,
        },
        paymentBreakdown,
        trends: {
          // We can add more trend data here
        },
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