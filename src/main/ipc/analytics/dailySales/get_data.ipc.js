// src/main/ipc/analytics/dailySales/get_data.ipc.js
const saleService = require("../../../../services/Sale");
const saleItemService = require("../../../../services/SaleItem");
const meatService = require("../../../../services/Meat");

module.exports = async (params) => {
  const { 
    date,
    startDate,
    endDate,
    page = 1, 
    limit = 20, 
    sortBy = "timestamp", 
    sortOrder = "DESC",
    paymentMethod,
    customerId,
    status = "paid",
    minAmount,
    maxAmount,
  } = params;

  try {
    // Determine date range
    let start, end;
    if (date) {
      start = new Date(date);
      start.setHours(0, 0, 0, 0);
      end = new Date(date);
      end.setHours(23, 59, 59, 999);
    } else if (startDate && endDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      // Default to today
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    // Get sales for the date range
    const salesOptions = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status,
      paymentMethod,
      customerId,
      minAmount,
      maxAmount,
      page,
      limit,
      sortBy,
      sortOrder,
    };

    const salesResult = await saleService.findAll(salesOptions);
    const sales = salesResult.data;

    // Get sales items for these sales to get detailed breakdown
    const saleIds = sales.map(s => s.id);
    let items = [];
    if (saleIds.length > 0) {
      const itemsOptions = {
        saleId: saleIds,
        limit: 10000,
      };
      const itemsResult = await saleItemService.findAll(itemsOptions);
      items = itemsResult.data;
    }

    // Enrich sales with items
    const enrichedSales = sales.map(sale => {
      const saleItems = items.filter(item => item.saleId === sale.id);
      const totalWeight = saleItems.reduce((sum, item) => sum + item.weightKg, 0);
      const totalDiscount = saleItems.reduce((sum, item) => sum + item.discount, 0);
      const totalTax = saleItems.reduce((sum, item) => sum + item.tax, 0);
      
      return {
        ...sale,
        saleItems,
        totalWeight,
        totalDiscount,
        totalTax,
        // Add customer name for convenience
        customerName: sale.customer?.name || "Walk-in",
      };
    });

    // Get summary statistics for the period
    const summary = await getDailySummary(start, end);

    // Get hourly breakdown
    const hourlyBreakdown = await getHourlyBreakdown(start, end);

    // Get top selling meats
    const topMeats = await getTopMeats(start, end);

    return {
      status: true,
      message: "Daily sales data retrieved successfully",
      data: {
        sales: enrichedSales,
        pagination: salesResult.pagination,
        summary,
        hourlyBreakdown,
        topMeats,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    };
  } catch (error) {
    console.error("Error in getDailySalesData:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve daily sales data",
      data: null,
    };
  }
};

/**
 * Get daily summary statistics
 */
async function getDailySummary(start, end) {
  try {
    const saleServiceInstance = saleService;
    const salesOptions = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: "paid",
      limit: 10000,
    };

    const salesResult = await saleServiceInstance.findAll(salesOptions);
    const sales = salesResult.data;

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Get all sale items for this period
    const saleIds = sales.map(s => s.id);
    let items = [];
    if (saleIds.length > 0) {
      const itemsResult = await saleItemService.findAll({
        saleId: saleIds,
        limit: 10000,
      });
      items = itemsResult.data;
    }

    const totalWeight = items.reduce((sum, item) => sum + item.weightKg, 0);
    const totalDiscount = sales.reduce((sum, s) => sum + s.totalDiscount, 0);

    // Count unique customers
    const uniqueCustomers = new Set(sales.map(s => s.customerId).filter(id => id !== null));

    // Payment method breakdown
    const paymentMethods = {};
    sales.forEach(s => {
      const method = s.paymentMethod || "unknown";
      paymentMethods[method] = (paymentMethods[method] || 0) + 1;
    });

    return {
      totalSales,
      totalRevenue,
      averageTicket,
      totalWeight,
      totalDiscount,
      uniqueCustomers: uniqueCustomers.size,
      paymentMethods,
    };
  } catch (error) {
    console.error("Error calculating daily summary:", error);
    return {
      totalSales: 0,
      totalRevenue: 0,
      averageTicket: 0,
      totalWeight: 0,
      totalDiscount: 0,
      uniqueCustomers: 0,
      paymentMethods: {},
    };
  }
}

/**
 * Get hourly breakdown of sales
 */
async function getHourlyBreakdown(start, end) {
  try {
    const salesOptions = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: "paid",
      limit: 10000,
    };

    const salesResult = await saleService.findAll(salesOptions);
    const sales = salesResult.data;

    const hourlyData = {};
    
    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { count: 0, revenue: 0, weight: 0 };
    }

    // Get all sale items for this period
    const saleIds = sales.map(s => s.id);
    let items = [];
    if (saleIds.length > 0) {
      const itemsResult = await saleItemService.findAll({
        saleId: saleIds,
        limit: 10000,
      });
      items = itemsResult.data;
    }

    // Group by hour
    sales.forEach(sale => {
      const hour = new Date(sale.timestamp).getHours();
      hourlyData[hour].count += 1;
      hourlyData[hour].revenue += sale.totalAmount;
    });

    items.forEach(item => {
      const sale = sales.find(s => s.id === item.saleId);
      if (sale) {
        const hour = new Date(sale.timestamp).getHours();
        hourlyData[hour].weight += item.weightKg;
      }
    });

    // Convert to array format
    const hourlyArray = Object.entries(hourlyData).map(([hour, data]) => ({
      hour: parseInt(hour),
      ...data,
    }));

    return hourlyArray;
  } catch (error) {
    console.error("Error calculating hourly breakdown:", error);
    return [];
  }
}

/**
 * Get top selling meats
 */
async function getTopMeats(start, end) {
  try {
    const salesOptions = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: "paid",
      limit: 10000,
    };

    const salesResult = await saleService.findAll(salesOptions);
    const sales = salesResult.data;
    const saleIds = sales.map(s => s.id);

    let items = [];
    if (saleIds.length > 0) {
      const itemsResult = await saleItemService.findAll({
        saleId: saleIds,
        limit: 10000,
      });
      items = itemsResult.data;
    }

    // Group by meat
    const meatMap = {};
    items.forEach(item => {
      const meatId = item.meatId;
      if (!meatMap[meatId]) {
        meatMap[meatId] = {
          meatId,
          meatName: item.meat?.name || "Unknown",
          totalWeight: 0,
          totalRevenue: 0,
          count: 0,
        };
      }
      meatMap[meatId].totalWeight += item.weightKg;
      meatMap[meatId].totalRevenue += item.lineTotal;
      meatMap[meatId].count += 1;
    });

    // Convert to array and sort by revenue
    const topMeats = Object.values(meatMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    return topMeats;
  } catch (error) {
    console.error("Error calculating top meats:", error);
    return [];
  }
}