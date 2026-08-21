// src/main/ipc/dashboard/get_customer_stats.ipc.js
//@ts-check
const customerService = require("../../../../services/Customer");
const saleService = require("../../../../services/Sale");

module.exports = async (params) => {
  try {
    // Get total customers
    const customerResult = await customerService.findAll({ isActive: true, limit: 1 });
    const totalCustomers = customerResult.pagination?.total || 0;

    // Get new customers today
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const newTodayOptions = {
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString(),
      limit: 1,
    };
    const newTodayResult = await customerService.findAll(newTodayOptions);
    const newCustomersToday = newTodayResult.pagination?.total || 0;

    // Get new customers this week
    const startOfWeek = new Date(today);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const newWeekOptions = {
      startDate: startOfWeek.toISOString(),
      endDate: endOfDay.toISOString(),
      limit: 1,
    };
    const newWeekResult = await customerService.findAll(newWeekOptions);
    const newCustomersThisWeek = newWeekResult.pagination?.total || 0;

    // Get top spenders (from sales)
    const salesOptions = {
      status: "paid",
      limit: 10000,
    };
    const salesResult = await saleService.findAll(salesOptions);
    const sales = salesResult.data;

    // Group by customer
    const customerSpend = {};
    sales.forEach((sale) => {
      const customerId = sale.customerId;
      if (customerId) {
        if (!customerSpend[customerId]) {
          customerSpend[customerId] = { customerId, totalSpent: 0, name: sale.customer?.name || "Unknown" };
        }
        customerSpend[customerId].totalSpent += sale.totalAmount;
      }
    });

    const topSpenders = Object.values(customerSpend)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Loyalty distribution
    const loyaltyDistribution = [
      { range: "0-100", count: 0 },
      { range: "101-500", count: 0 },
      { range: "501-1000", count: 0 },
      { range: "1000+", count: 0 },
    ];

    const allCustomersResult = await customerService.findAll({ isActive: true, limit: 10000 });
    allCustomersResult.data.forEach((customer) => {
      const points = customer.loyaltyPointsBalance || 0;
      if (points <= 100) loyaltyDistribution[0].count++;
      else if (points <= 500) loyaltyDistribution[1].count++;
      else if (points <= 1000) loyaltyDistribution[2].count++;
      else loyaltyDistribution[3].count++;
    });

    return {
      status: true,
      message: "Customer stats retrieved successfully",
      data: {
        totalCustomers,
        newCustomersToday,
        newCustomersThisWeek,
        topSpenders,
        loyaltyDistribution,
      },
    };
  } catch (error) {
    console.error("Error in getCustomerStats:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve customer stats",
      data: null,
    };
  }
};