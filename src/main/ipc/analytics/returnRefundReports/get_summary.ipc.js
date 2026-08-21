// src/main/ipc/analytics/returnRefundReports/get_summary.ipc.js
const returnRefundService = require("../../../../services/ReturnRefund");
const saleService = require("../../../../services/Sale");

module.exports = async (params) => {
  const { 
    period = "month",
    status = "processed",
  } = params || {};

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
        start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
    }

    // Get returns/refunds
    const returnOptions = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status,
      limit: 10000,
    };
    const returnResult = await returnRefundService.findAll(returnOptions);
    const returns = returnResult.data;

    // Get total sales for the period to calculate return rate
    const salesOptions = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: "paid",
      limit: 10000,
    };
    const salesResult = await saleService.findAll(salesOptions);
    const sales = salesResult.data;

    const totalSalesCount = sales.length;
    const totalSalesAmount = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalReturnsCount = returns.length;
    const totalReturnsAmount = returns.reduce((sum, r) => sum + r.totalAmount, 0);

    // Return rate (by count and amount)
    const returnRateByCount = totalSalesCount > 0 ? (totalReturnsCount / totalSalesCount) * 100 : 0;
    const returnRateByAmount = totalSalesAmount > 0 ? (totalReturnsAmount / totalSalesAmount) * 100 : 0;

    // Status breakdown
    const statusBreakdown = {};
    returns.forEach(r => {
      statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1;
    });

    // Refund method breakdown
    const methodBreakdown = {};
    returns.forEach(r => {
      const method = r.refundMethod || "unknown";
      methodBreakdown[method] = (methodBreakdown[method] || 0) + 1;
    });

    // Average refund per return
    const avgRefund = totalReturnsCount > 0 ? totalReturnsAmount / totalReturnsCount : 0;

    // Top customers by return count
    const customerMap = {};
    returns.forEach(r => {
      const custId = r.customerId;
      if (!customerMap[custId]) {
        customerMap[custId] = {
          customerId: custId,
          customerName: r.customer?.name || "Unknown",
          count: 0,
          totalAmount: 0,
        };
      }
      customerMap[custId].count += 1;
      customerMap[custId].totalAmount += r.totalAmount;
    });
    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get previous period for comparison
    const prevStart = new Date(start);
    const prevEnd = new Date(start);
    const diff = end - start;
    prevStart.setTime(prevStart.getTime() - diff);
    prevEnd.setTime(prevEnd.getTime() - diff);

    const prevReturnOptions = {
      startDate: prevStart.toISOString(),
      endDate: prevEnd.toISOString(),
      status,
      limit: 10000,
    };
    const prevReturnResult = await returnRefundService.findAll(prevReturnOptions);
    const prevReturnsCount = prevReturnResult.data.length;
    const prevReturnsAmount = prevReturnResult.data.reduce((sum, r) => sum + r.totalAmount, 0);

    const returnCountChange = prevReturnsCount > 0 ? ((totalReturnsCount - prevReturnsCount) / prevReturnsCount) * 100 : 0;
    const returnAmountChange = prevReturnsAmount > 0 ? ((totalReturnsAmount - prevReturnsAmount) / prevReturnsAmount) * 100 : 0;

    return {
      status: true,
      message: "Return refund summary retrieved successfully",
      data: {
        period,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        summary: {
          totalReturns: totalReturnsCount,
          totalReturnsAmount,
          totalSalesCount,
          totalSalesAmount,
          returnRateByCount,
          returnRateByAmount,
          avgRefund,
          statusBreakdown,
          methodBreakdown,
          topCustomers,
        },
        comparison: {
          previousReturnsCount: prevReturnsCount,
          previousReturnsAmount: prevReturnsAmount,
          returnCountChange,
          returnAmountChange,
        },
        trends: {
          // We can add trend data here if needed
        },
      },
    };
  } catch (error) {
    console.error("Error in getReturnRefundSummary:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve return refund summary",
      data: null,
    };
  }
};