// src/main/ipc/analytics/returnRefundReports/get_data.ipc.js
const returnRefundService = require("../../../../services/ReturnRefund");
const saleService = require("../../../../services/Sale");
const customerService = require("../../../../services/Customer");
const meatService = require("../../../../services/Meat");

module.exports = async (params) => {
  const { 
    startDate,
    endDate,
    status,
    refundMethod,
    customerId,
    saleId,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "DESC",
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

    // Get returns/refunds
    const returnOptions = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status,
      refundMethod,
      customerId,
      saleId,
      page,
      limit,
      sortBy,
      sortOrder,
    };
    const returnResult = await returnRefundService.findAll(returnOptions);
    const returns = returnResult.data;

    // Enrich returns with additional data
    const enrichedReturns = await Promise.all(
      returns.map(async (ret) => {
        // Get associated sale
        const sale = ret.sale || null;
        
        // Get customer details
        const customer = ret.customer || null;

        // Get items with meat details
        const items = ret.items || [];

        // Calculate metrics
        const totalWeight = items.reduce((sum, item) => sum + item.weightKg, 0);

        return {
          ...ret,
          sale,
          customer,
          items,
          totalWeight,
          // For display
          customerName: customer?.name || "Unknown",
          saleReference: sale?.referenceNo || ret.saleId,
        };
      })
    );

    // Get summary statistics
    const summary = await getReturnSummary(start, end, status, refundMethod, customerId, saleId);

    // Get top items returned
    const topItems = await getTopReturnedItems(start, end);

    // Get return reasons breakdown
    const reasonBreakdown = await getReasonBreakdown(start, end);

    // Get daily trend
    const dailyTrend = await getDailyReturnTrend(start, end);

    return {
      status: true,
      message: "Return refund data retrieved successfully",
      data: {
        returns: enrichedReturns,
        pagination: returnResult.pagination,
        summary,
        topItems,
        reasonBreakdown,
        dailyTrend,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    };
  } catch (error) {
    console.error("Error in getReturnRefundData:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve return refund data",
      data: null,
    };
  }
};

/**
 * Get return summary statistics
 */
async function getReturnSummary(start, end, status, refundMethod, customerId, saleId) {
  try {
    const options = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status,
      refundMethod,
      customerId,
      saleId,
      limit: 10000,
    };
    const result = await returnRefundService.findAll(options);
    const returns = result.data;

    const totalReturns = returns.length;
    const totalAmount = returns.reduce((sum, r) => sum + r.totalAmount, 0);
    const processedCount = returns.filter(r => r.status === "processed").length;
    const pendingCount = returns.filter(r => r.status === "pending").length;
    const cancelledCount = returns.filter(r => r.status === "cancelled").length;
    const processedAmount = returns.filter(r => r.status === "processed").reduce((sum, r) => sum + r.totalAmount, 0);

    // Average refund amount
    const avgAmount = totalReturns > 0 ? totalAmount / totalReturns : 0;

    // Refund method breakdown
    const methodBreakdown = {};
    returns.forEach(r => {
      const method = r.refundMethod || "unknown";
      methodBreakdown[method] = (methodBreakdown[method] || 0) + 1;
    });

    // Get unique customers
    const uniqueCustomers = new Set(returns.map(r => r.customerId).filter(id => id !== null));

    return {
      totalReturns,
      totalAmount,
      processedCount,
      pendingCount,
      cancelledCount,
      processedAmount,
      avgAmount,
      methodBreakdown,
      uniqueCustomers: uniqueCustomers.size,
    };
  } catch (error) {
    console.error("Error calculating return summary:", error);
    return {
      totalReturns: 0,
      totalAmount: 0,
      processedCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
      processedAmount: 0,
      avgAmount: 0,
      methodBreakdown: {},
      uniqueCustomers: 0,
    };
  }
}

/**
 * Get top items returned (by weight or amount)
 */
async function getTopReturnedItems(start, end) {
  try {
    const options = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: "processed",
      limit: 10000,
    };
    const result = await returnRefundService.findAll(options);
    const returns = result.data;

    // Collect all items
    const itemsMap = {};
    returns.forEach(ret => {
      if (ret.items) {
        ret.items.forEach(item => {
          const meatId = item.meatId;
          if (!itemsMap[meatId]) {
            itemsMap[meatId] = {
              meatId,
              meatName: item.meat?.name || "Unknown",
              totalWeight: 0,
              totalAmount: 0,
              count: 0,
            };
          }
          itemsMap[meatId].totalWeight += item.weightKg || 0;
          itemsMap[meatId].totalAmount += item.subtotal || 0;
          itemsMap[meatId].count += 1;
        });
      }
    });

    return Object.values(itemsMap)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);
  } catch (error) {
    console.error("Error getting top returned items:", error);
    return [];
  }
}

/**
 * Get return reasons breakdown
 */
async function getReasonBreakdown(start, end) {
  try {
    const options = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 10000,
    };
    const result = await returnRefundService.findAll(options);
    const returns = result.data;

    const reasons = {};
    returns.forEach(ret => {
      const reason = ret.reason || "No reason provided";
      reasons[reason] = (reasons[reason] || 0) + 1;
    });

    return Object.entries(reasons).map(([reason, count]) => ({
      reason,
      count,
    })).sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error("Error getting reason breakdown:", error);
    return [];
  }
}

/**
 * Get daily return trend
 */
async function getDailyReturnTrend(start, end) {
  try {
    const options = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 10000,
    };
    const result = await returnRefundService.findAll(options);
    const returns = result.data;

    const dailyData = {};
    const current = new Date(start);
    while (current <= end) {
      const key = current.toISOString().split("T")[0];
      dailyData[key] = { count: 0, amount: 0 };
      current.setDate(current.getDate() + 1);
    }

    returns.forEach(ret => {
      const key = new Date(ret.createdAt).toISOString().split("T")[0];
      if (dailyData[key]) {
        dailyData[key].count += 1;
        dailyData[key].amount += ret.totalAmount;
      }
    });

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      ...data,
    }));
  } catch (error) {
    console.error("Error getting daily trend:", error);
    return [];
  }
}