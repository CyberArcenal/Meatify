// src/main/ipc/analytics/salesReport/get_data.ipc.js
const saleService = require("../../../services/SaleService");
const saleItemService = require("../../../services/SaleItemService");
const customerService = require("../../../services/CustomerService");
const meatService = require("../../../services/MeatService");
const returnRefundService = require("../../../services/ReturnRefundService");

module.exports = async (params) => {
  const { 
    startDate,
    endDate,
    groupBy = "day", // day, week, month, year
    page = 1,
    limit = 20,
    sortBy = "timestamp",
    sortOrder = "DESC",
    paymentMethod,
    customerId,
    meatId,
    status = "paid",
    minAmount,
    maxAmount,
    includeProductBreakdown = true,
    includeCustomerBreakdown = true,
    includeRefundData = true,
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

    // Get sales data
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

    // Get sale items for product breakdown
    let saleItems = [];
    if (includeProductBreakdown && sales.length > 0) {
      const saleIds = sales.map(s => s.id);
      const itemsOptions = {
        saleId: saleIds,
        limit: 10000,
      };
      const itemsResult = await saleItemService.findAll(itemsOptions);
      saleItems = itemsResult.data;
    }

    // Get refund data
    let refunds = [];
    if (includeRefundData) {
      const refundOptions = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        status: "processed",
        limit: 10000,
      };
      const refundResult = await returnRefundService.findAll(refundOptions);
      refunds = refundResult.data;
    }

    // Get customer data for breakdown
    let customers = [];
    if (includeCustomerBreakdown && sales.length > 0) {
      const customerIds = [...new Set(sales.map(s => s.customerId).filter(id => id !== null))];
      if (customerIds.length > 0) {
        const customerPromises = customerIds.map(id => customerService.findById(id));
        customers = await Promise.all(customerPromises);
      }
    }

    // Build enriched sales data
    const enrichedSales = sales.map(sale => {
      const items = saleItems.filter(item => item.saleId === sale.id);
      const totalWeight = items.reduce((sum, item) => sum + item.weightKg, 0);
      const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
      const totalTax = items.reduce((sum, item) => sum + item.tax, 0);
      
      return {
        ...sale,
        saleItems: items,
        totalWeight,
        totalDiscount,
        totalTax,
        customerName: sale.customer?.name || "Walk-in",
        itemCount: items.length,
      };
    });

    // Generate product breakdown
    let productBreakdown = [];
    if (includeProductBreakdown) {
      const productMap = {};
      saleItems.forEach(item => {
        const key = item.meatId;
        if (!productMap[key]) {
          productMap[key] = {
            meatId: item.meatId,
            meatName: item.meat?.name || "Unknown",
            sku: item.meat?.sku || "",
            totalWeight: 0,
            totalRevenue: 0,
            quantity: 0,
            averagePrice: 0,
          };
        }
        productMap[key].totalWeight += item.weightKg;
        productMap[key].totalRevenue += item.lineTotal || 0;
        productMap[key].quantity += 1;
      });
      
      productBreakdown = Object.values(productMap).map(p => ({
        ...p,
        averagePrice: p.quantity > 0 ? p.totalRevenue / p.quantity : 0,
      })).sort((a, b) => b.totalRevenue - a.totalRevenue);
    }

    // Generate customer breakdown
    let customerBreakdown = [];
    if (includeCustomerBreakdown) {
      const customerMap = {};
      sales.forEach(sale => {
        const id = sale.customerId || "walk-in";
        if (!customerMap[id]) {
          customerMap[id] = {
            customerId: id,
            customerName: sale.customerName || "Walk-in",
            totalSpent: 0,
            purchaseCount: 0,
            averageTicket: 0,
          };
        }
        customerMap[id].totalSpent += sale.totalAmount;
        customerMap[id].purchaseCount += 1;
      });
      
      customerBreakdown = Object.values(customerMap).map(c => ({
        ...c,
        averageTicket: c.purchaseCount > 0 ? c.totalSpent / c.purchaseCount : 0,
      })).sort((a, b) => b.totalSpent - a.totalSpent);
    }

    // Get daily trend
    const dailyTrend = getDailySalesTrend(sales, start, end);

    // Get aggregated summary
    const summary = await getSalesReportSummary(start, end, sales, refunds);

    // Get top selling products
    const topProducts = productBreakdown.slice(0, 10);

    return {
      status: true,
      message: "Sales report data retrieved successfully",
      data: {
        sales: enrichedSales,
        pagination: salesResult.pagination,
        summary,
        productBreakdown,
        customerBreakdown,
        topProducts,
        dailyTrend,
        refunds: includeRefundData ? refunds : [],
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        filters: {
          paymentMethod,
          customerId,
          meatId,
          status,
          minAmount,
          maxAmount,
        },
      },
    };
  } catch (error) {
    console.error("Error in getSalesReportData:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve sales report data",
      data: null,
    };
  }
};

/**
 * Get daily sales trend
 */
function getDailySalesTrend(sales, start, end) {
  const dailyData = {};
  const current = new Date(start);
  while (current <= end) {
    const key = current.toISOString().split("T")[0];
    dailyData[key] = { date: key, revenue: 0, count: 0, weight: 0 };
    current.setDate(current.getDate() + 1);
  }

  sales.forEach(sale => {
    const key = new Date(sale.timestamp).toISOString().split("T")[0];
    if (dailyData[key]) {
      dailyData[key].revenue += sale.totalAmount;
      dailyData[key].count += 1;
    }
  });

  // We'd need sale items to add weight, but we'll skip for now
  return Object.values(dailyData);
}

/**
 * Get sales report summary
 */
async function getSalesReportSummary(start, end, sales, refunds) {
  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalTransactions = sales.length;
  const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const totalDiscounts = sales.reduce((sum, s) => sum + (s.totalDiscount || 0), 0);
  const totalRefunds = refunds.reduce((sum, r) => sum + r.totalAmount, 0);
  const netRevenue = totalRevenue - totalRefunds;

  // Payment method breakdown
  const paymentMethods = {};
  sales.forEach(s => {
    const method = s.paymentMethod || "unknown";
    if (!paymentMethods[method]) {
      paymentMethods[method] = { count: 0, total: 0 };
    }
    paymentMethods[method].count += 1;
    paymentMethods[method].total += s.totalAmount;
  });

  return {
    totalRevenue,
    totalTransactions,
    averageTicket,
    totalDiscounts,
    totalRefunds,
    netRevenue,
    paymentMethods,
    days: Math.ceil((end - start) / (1000 * 60 * 60 * 24)),
    averageDailyRevenue: Math.ceil((end - start) / (1000 * 60 * 60 * 24)) > 0 
      ? totalRevenue / Math.ceil((end - start) / (1000 * 60 * 60 * 24)) 
      : 0,
  };
}