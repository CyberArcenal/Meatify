// src/main/ipc/analytics/dailySales/get_summary.ipc.js
const saleService = require("../../../services/SaleService");
const saleItemService = require("../../../services/SaleItemService");

module.exports = async (params) => {
  const { date } = params || {};

  try {
    // Determine date range for today
    const today = date ? new Date(date) : new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    // Get today's sales
    const salesOptions = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: "paid",
      limit: 10000,
    };

    const salesResult = await saleService.findAll(salesOptions);
    const sales = salesResult.data;

    // Get sale items for today
    const saleIds = sales.map(s => s.id);
    let items = [];
    if (saleIds.length > 0) {
      const itemsResult = await saleItemService.findAll({
        saleId: saleIds,
        limit: 10000,
      });
      items = itemsResult.data;
    }

    // Calculate metrics
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalWeight = items.reduce((sum, item) => sum + item.weightKg, 0);
    const totalDiscount = sales.reduce((sum, s) => sum + s.totalDiscount, 0);
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Payment method breakdown
    const paymentMethods = {};
    sales.forEach(s => {
      const method = s.paymentMethod || "unknown";
      paymentMethods[method] = (paymentMethods[method] || 0) + 1;
    });

    // Top selling items (by weight)
    const itemMap = {};
    items.forEach(item => {
      const meatId = item.meatId;
      if (!itemMap[meatId]) {
        itemMap[meatId] = {
          meatId,
          meatName: item.meat?.name || "Unknown",
          totalWeight: 0,
          totalRevenue: 0,
          count: 0,
        };
      }
      itemMap[meatId].totalWeight += item.weightKg;
      itemMap[meatId].totalRevenue += item.lineTotal;
      itemMap[meatId].count += 1;
    });

    const topItems = Object.values(itemMap)
      .sort((a, b) => b.totalWeight - a.totalWeight)
      .slice(0, 5);

    // Hourly breakdown
    const hourlyData = {};
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { count: 0, revenue: 0 };
    }
    sales.forEach(sale => {
      const hour = new Date(sale.timestamp).getHours();
      hourlyData[hour].count += 1;
      hourlyData[hour].revenue += sale.totalAmount;
    });

    const hourlyBreakdown = Object.entries(hourlyData).map(([hour, data]) => ({
      hour: parseInt(hour),
      ...data,
    }));

    // Compare with yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStart = new Date(yesterday);
    yStart.setHours(0, 0, 0, 0);
    const yEnd = new Date(yesterday);
    yEnd.setHours(23, 59, 59, 999);

    const ySalesOptions = {
      startDate: yStart.toISOString(),
      endDate: yEnd.toISOString(),
      status: "paid",
      limit: 10000,
    };

    const ySalesResult = await saleService.findAll(ySalesOptions);
    const yesterdayRevenue = ySalesResult.data.reduce((sum, s) => sum + s.totalAmount, 0);
    const yesterdayCount = ySalesResult.data.length;

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
        totalRevenue,
        totalWeight,
        totalDiscount,
        averageTicket,
        paymentMethods,
        topItems,
        hourlyBreakdown,
        comparison: {
          yesterdayRevenue,
          yesterdayCount,
          revenueChange,
          countChange,
        },
        trends: {
          // Simple trend: compare with same day last week
          // We can add more complex trend analysis here
        },
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