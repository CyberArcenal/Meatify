// src/main/ipc/analytics/customerInsights/get_summary.ipc.js
const customerService = require("../../../../services/Customer");

module.exports = async (params) => {
  const { startDate, endDate } = params || {};

  try {
    // Get all active customers
    const allCustomers = await customerService.findAll({
      isActive: true,
      limit: 10000,
    });

    const customers = allCustomers.data;

    // Total customers
    const totalCustomers = customers.length;

    // By status
    const byStatus = {
      regular: customers.filter(c => c.status === "regular").length,
      vip: customers.filter(c => c.status === "vip").length,
      elite: customers.filter(c => c.status === "elite").length,
    };

    // Loyalty points summary
    const pointsSummary = {
      total: customers.reduce((sum, c) => sum + c.loyaltyPointsBalance, 0),
      average: totalCustomers > 0 ? customers.reduce((sum, c) => sum + c.loyaltyPointsBalance, 0) / totalCustomers : 0,
      max: totalCustomers > 0 ? Math.max(...customers.map(c => c.loyaltyPointsBalance)) : 0,
      min: totalCustomers > 0 ? Math.min(...customers.map(c => c.loyaltyPointsBalance)) : 0,
    };

    // Customers with points
    const customersWithPoints = customers.filter(c => c.loyaltyPointsBalance > 0).length;
    const customersWithoutPoints = totalCustomers - customersWithPoints;

    // Top customers by points
    const topCustomersByPoints = customers
      .sort((a, b) => b.loyaltyPointsBalance - a.loyaltyPointsBalance)
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        points: c.loyaltyPointsBalance,
        status: c.status,
      }));

    // Active vs inactive
    const activeCount = customers.filter(c => c.isActive).length;
    const inactiveCount = customers.filter(c => !c.isActive).length;

    return {
      status: true,
      message: "Customer insights summary retrieved successfully",
      data: {
        totalCustomers,
        byStatus,
        pointsSummary,
        customersWithPoints,
        customersWithoutPoints,
        topCustomersByPoints,
        activeCount,
        inactiveCount,
      },
    };
  } catch (error) {
    console.error("Error in getCustomerInsightsSummary:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve customer insights summary",
      data: null,
    };
  }
};