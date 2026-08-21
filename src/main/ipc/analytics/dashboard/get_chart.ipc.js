// src/main/ipc/dashboard/get_chart.ipc.js
//@ts-check
const saleService = require("../../../../services/Sale");

module.exports = async (params) => {
  const { days = 7, groupBy = "day" } = params;

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Get sales for the date range
    const salesOptions = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      status: "paid",
      limit: 10000,
    };

    const salesResult = await saleService.findAll(salesOptions);
    const sales = salesResult.data;

    // Group by date
    const dateMap = {};
    const currentDate = new Date(startDate);

    // Initialize all dates in range
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split("T")[0];
      dateMap[dateKey] = { date: dateKey, revenue: 0, count: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate sales data
    sales.forEach((sale) => {
      const dateKey = new Date(sale.timestamp).toISOString().split("T")[0];
      if (dateMap[dateKey]) {
        dateMap[dateKey].revenue += sale.totalAmount;
        dateMap[dateKey].count += 1;
      }
    });

    const chartData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

    return {
      status: true,
      message: "Sales chart data retrieved successfully",
      data: chartData,
    };
  } catch (error) {
    console.error("Error in getSalesChart:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve sales chart data",
      data: [],
    };
  }
};