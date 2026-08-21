// src/main/ipc/analytics/customerInsights/get_data.ipc.js
const customerService = require("../../../services/CustomerService");
const saleService = require("../../../services/SaleService");
const loyaltyTransactionService = require("../../../services/LoyaltyTransactionService");

module.exports = async (params) => {
  const { 
    page = 1, 
    limit = 20, 
    sortBy = "createdAt", 
    sortOrder = "DESC",
    search,
    status,
    isActive = true,
    minPoints,
    maxPoints,
    startDate,
    endDate
  } = params;

  try {
    // Get customers with filters
    const customersResult = await customerService.findAll({
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      status,
      isActive,
      minPoints,
      maxPoints,
    });

    // Get additional insights data
    const customers = customersResult.data;

    // Enrich each customer with additional data
    const enrichedCustomers = await Promise.all(
      customers.map(async (customer) => {
        // Get total spent (from sales)
        const salesOptions = {
          customerId: customer.id,
          status: "paid",
          startDate,
          endDate,
          limit: 1000,
        };
        const salesResult = await saleService.findAll(salesOptions);
        const totalSpent = salesResult.data.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const purchaseCount = salesResult.data.length;

        // Get loyalty transactions
        const loyaltyOptions = {
          customerId: customer.id,
          includeDeleted: false,
          limit: 1000,
        };
        const loyaltyResult = await loyaltyTransactionService.findAll(loyaltyOptions);
        const totalEarned = loyaltyResult.data
          .filter(tx => tx.transactionType === "earn")
          .reduce((sum, tx) => sum + tx.pointsChange, 0);
        const totalRedeemed = loyaltyResult.data
          .filter(tx => tx.transactionType === "redeem")
          .reduce((sum, tx) => sum + Math.abs(tx.pointsChange), 0);

        // Last purchase date
        const lastPurchase = salesResult.data.length > 0 
          ? salesResult.data[0]?.timestamp || null 
          : null;

        return {
          ...customer,
          totalSpent,
          purchaseCount,
          totalEarned,
          totalRedeemed,
          lastPurchase,
          averageTicket: purchaseCount > 0 ? totalSpent / purchaseCount : 0,
        };
      })
    );

    // Get summary statistics
    const summary = await getSummaryData(startDate, endDate);

    return {
      status: true,
      message: "Customer insights data retrieved successfully",
      data: {
        customers: enrichedCustomers,
        pagination: customersResult.pagination,
        summary,
      },
    };
  } catch (error) {
    console.error("Error in getCustomerInsightsData:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve customer insights data",
      data: null,
    };
  }
};

/**
 * Get summary data for the insights dashboard
 */
async function getSummaryData(startDate, endDate) {
  try {
    // Get all active customers
    const allCustomers = await customerService.findAll({
      isActive: true,
      limit: 10000,
    });

    const customers = allCustomers.data;

    // Total customers
    const totalCustomers = customers.length;

    // Active customers (have at least one sale)
    const salesOptions = {
      status: "paid",
      startDate,
      endDate,
      limit: 10000,
    };
    const salesResult = await saleService.findAll(salesOptions);
    const uniqueCustomerIds = new Set(salesResult.data.map(s => s.customerId).filter(id => id !== null));
    const activeCustomers = uniqueCustomerIds.size;

    // Total loyalty points across all customers
    const totalPoints = customers.reduce((sum, c) => sum + c.loyaltyPointsBalance, 0);

    // Average points per customer
    const avgPoints = totalCustomers > 0 ? totalPoints / totalCustomers : 0;

    // VIP and Elite count
    const vipCount = customers.filter(c => c.status === "vip").length;
    const eliteCount = customers.filter(c => c.status === "elite").length;

    // New customers in period
    let newCustomers = 0;
    if (startDate) {
      const newCustomersResult = await customerService.findAll({
        isActive: true,
        startDate,
        endDate,
        limit: 10000,
      });
      newCustomers = newCustomersResult.data.length;
    }

    // Top 5 customers by total spent
    const topCustomers = customers
      .map(c => ({
        ...c,
        totalSpent: 0,
        purchaseCount: 0,
      }))
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, 5);

    return {
      totalCustomers,
      activeCustomers,
      totalPoints,
      avgPoints,
      vipCount,
      eliteCount,
      newCustomers,
      topCustomers,
    };
  } catch (error) {
    console.error("Error generating summary data:", error);
    return {
      totalCustomers: 0,
      activeCustomers: 0,
      totalPoints: 0,
      avgPoints: 0,
      vipCount: 0,
      eliteCount: 0,
      newCustomers: 0,
      topCustomers: [],
    };
  }
}