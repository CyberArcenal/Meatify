// src/main/ipc/analytics/salesReport/get_summary.ipc.js
const saleService = require("../../../services/SaleService");
const saleItemService = require("../../../services/SaleItemService");
const customerService = require("../../../services/CustomerService");
const meatService = require("../../../services/MeatService");

module.exports = async (params) => {
  const { 
    period = "month", // week, month, quarter, year
    startDate,
    endDate,
  } = params || {};

  try {
    // Determine date range
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

    // Get sales
    const salesOptions = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: "paid",
      limit: 10000,
    };
    const salesResult = await saleService.findAll(salesOptions);
    const sales = salesResult.data;

    // Get sale items for product analysis
    const saleIds = sales.map(s => s.id);
    let saleItems = [];
    if (saleIds.length > 0) {
      const itemsOptions = {
        saleId: saleIds,
        limit: 10000,
      };
      const itemsResult = await saleItemService.findAll(itemsOptions);
      saleItems = itemsResult.data;
    }

    // Calculate key metrics
    const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalTransactions = sales.length;
    const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const totalDiscounts = sales.reduce((sum, s) => sum + (s.totalDiscount || 0), 0);
    const totalWeight = saleItems.reduce((sum, i) => sum + i.weightKg, 0);

    // Payment method breakdown
    const paymentMethods = {};
    sales.forEach(s => {
      const method = s.paymentMethod || "unknown";
      paymentMethods[method] = (paymentMethods[method] || 0) + s.totalAmount;
    });

    // Top products
    const productMap = {};
    saleItems.forEach(item => {
      const key = item.meatId;
      if (!productMap[key]) {
        productMap[key] = {
          meatId: item.meatId,
          meatName: item.meat?.name || "Unknown",
          totalRevenue: 0,
          totalWeight: 0,
          count: 0,
        };
      }
      productMap[key].totalRevenue += item.lineTotal || 0;
      productMap[key].totalWeight += item.weightKg;
      productMap[key].count += 1;
    });
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Top customers
    const customerMap = {};
    sales.forEach(sale => {
      const id = sale.customerId || "walk-in";
      if (!customerMap[id]) {
        customerMap[id] = {
          customerId: id,
          customerName: sale.customer?.name || "Walk-in",
          totalSpent: 0,
          purchaseCount: 0,
        };
      }
      customerMap[id].totalSpent += sale.totalAmount;
      customerMap[id].purchaseCount += 1;
    });
    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Get daily trend
    const dailyTrend = [];
    const current = new Date(start);
    const dailyData = {};
    while (current <= end) {
      const key = current.toISOString().split("T")[0];
      dailyData[key] = { date: key, revenue: 0, count: 0 };
      current.setDate(current.getDate() + 1);
    }
    sales.forEach(sale => {
      const key = new Date(sale.timestamp).toISOString().split("T")[0];
      if (dailyData[key]) {
        dailyData[key].revenue += sale.totalAmount;
        dailyData[key].count += 1;
      }
    });
    Object.values(dailyData).forEach(d => dailyTrend.push(d));

    // Get weekly trend
    const weeklyTrend = [];
    const weekData = {};
    sales.forEach(sale => {
      const d = new Date(sale.timestamp);
      const weekKey = `${d.getFullYear()}-W${String(Math.ceil((d.getDate() + 6 - d.getDay()) / 7)).padStart(2, '0')}`;
      if (!weekData[weekKey]) {
        weekData[weekKey] = { week: weekKey, revenue: 0, count: 0 };
      }
      weekData[weekKey].revenue += sale.totalAmount;
      weekData[weekKey].count += 1;
    });
    Object.values(weekData).forEach(w => weeklyTrend.push(w));

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
          averageDailyRevenue: dailyTrend.length > 0 ? totalRevenue / dailyTrend.length : 0,
        },
        paymentMethods,
        topProducts,
        topCustomers,
        trends: {
          daily: dailyTrend,
          weekly: weeklyTrend,
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