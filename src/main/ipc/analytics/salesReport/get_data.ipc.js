// src/main/ipc/analytics/salesReport/get_data.ipc.js
const saleService = require("../../../../services/Sale");
const saleItemService = require("../../../../services/SaleItem");
const customerService = require("../../../../services/Customer");
const meatService = require("../../../../services/Meat");
const returnRefundService = require("../../../../services/ReturnRefund");

module.exports = async (params) => {
  const { 
    startDate,
    endDate,
    groupBy = "day",
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
      start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    // Build sales options - only include customerId if valid
    const salesOptions = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status,
      paymentMethod,
      minAmount,
      maxAmount,
      page,
      limit,
      sortBy,
      sortOrder,
    };
    
    // ✅ Only add customerId if it's a valid number
    if (customerId !== undefined && customerId !== null && !isNaN(customerId)) {
      salesOptions.customerId = customerId;
    }

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
      // ✅ Filter out null, undefined, and invalid IDs
      const customerIds = [...new Set(
        sales
          .map(s => s.customerId)
          .filter(id => id !== null && id !== undefined && !isNaN(id) && id > 0)
      )];
      
      if (customerIds.length > 0) {
        // ✅ Use try-catch for each customer fetch to prevent one failure from breaking all
        const customerPromises = customerIds.map(async (id) => {
          try {
            return await customerService.findById(id);
          } catch (err) {
            console.warn(`[SalesReport] Failed to fetch customer ${id}:`, err.message);
            return null;
          }
        });
        customers = (await Promise.all(customerPromises)).filter(c => c !== null);
      }
    }

    // Build enriched sales data
    const enrichedSales = sales.map(sale => {
      const items = saleItems.filter(item => item.saleId === sale.id);
      const totalWeight = items.reduce((sum, item) => sum + (item.weightKg || 0), 0);
      const totalDiscount = items.reduce((sum, item) => sum + (item.discount || 0), 0);
      const totalTax = items.reduce((sum, item) => sum + (item.tax || 0), 0);
      
      // Find customer name from fetched customers
      let customerName = "Walk-in";
      if (sale.customerId && sale.customerId > 0) {
        const found = customers.find(c => c.id === sale.customerId);
        if (found) customerName = found.name;
      }
      
      return {
        ...sale,
        saleItems: items,
        totalWeight,
        totalDiscount,
        totalTax,
        customerName,
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
        productMap[key].totalWeight += item.weightKg || 0;
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
            customerName: "Walk-in",
            totalSpent: 0,
            purchaseCount: 0,
            averageTicket: 0,
          };
        }
        customerMap[id].totalSpent += sale.totalAmount;
        customerMap[id].purchaseCount += 1;
      });
      
      // Update customer names from fetched customers
      customers.forEach(c => {
        const key = c.id;
        if (customerMap[key]) {
          customerMap[key].customerName = c.name;
        }
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
          customerId: customerId && !isNaN(customerId) ? customerId : undefined,
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

  const paymentMethods = {};
  sales.forEach(s => {
    const method = s.paymentMethod || "unknown";
    if (!paymentMethods[method]) {
      paymentMethods[method] = { count: 0, total: 0 };
    }
    paymentMethods[method].count += 1;
    paymentMethods[method].total += s.totalAmount;
  });

  const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

  return {
    totalRevenue,
    totalTransactions,
    averageTicket,
    totalDiscounts,
    totalRefunds,
    netRevenue,
    paymentMethods,
    days,
    averageDailyRevenue: totalRevenue / days,
  };
}