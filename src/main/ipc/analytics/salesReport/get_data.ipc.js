// src/main/ipc/analytics/salesReport/get_data.ipc.js
//@ts-check
const { AppDataSource } = require("../../../db/data-source");
const Sale = require("../../../../entities/Sale");
const SaleItem = require("../../../../entities/SaleItem");
const ReturnRefund = require("../../../../entities/ReturnRefund");
const { paginateQueryBuilder } = require("../../../../utils/dbUtils/pagination");

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

    const saleRepo = AppDataSource.getRepository(Sale);

    // ─── 1. Build main sale query with pagination ──────────────
    const qb = saleRepo
      .createQueryBuilder("sale")
      .leftJoinAndSelect("sale.customer", "customer")
      .leftJoinAndSelect("sale.saleItems", "saleItems")
      .leftJoinAndSelect("saleItems.meat", "meat")
      .where("sale.status = :status", { status })
      .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end });

    if (paymentMethod) qb.andWhere("sale.paymentMethod = :paymentMethod", { paymentMethod });
    if (customerId) qb.andWhere("sale.customerId = :customerId", { customerId });
    if (minAmount) qb.andWhere("sale.totalAmount >= :minAmount", { minAmount });
    if (maxAmount) qb.andWhere("sale.totalAmount <= :maxAmount", { maxAmount });

    // If meatId filter is provided, we need to filter by sale items
    if (meatId) {
      qb.andWhere("EXISTS (SELECT 1 FROM sale_items si WHERE si.saleId = sale.id AND si.meatId = :meatId)", { meatId });
    }

    const allowedSortColumns = ["id", "timestamp", "status", "paymentMethod", "totalAmount", "createdAt", "updatedAt"];
    const sortBySafe = allowedSortColumns.includes(sortBy) ? sortBy : "timestamp";
    const sortOrderSafe = sortOrder === "ASC" ? "ASC" : "DESC";

    const salesResult = await paginateQueryBuilder(qb, {
      page,
      limit,
      sortBy: sortBySafe,
      sortOrder: sortOrderSafe,
    });
    const sales = salesResult.data || [];

    // ─── 2. Enrich sales with computed fields ──────────────────
    const enrichedSales = sales.map(sale => {
      const items = sale.saleItems || [];
      const totalWeight = items.reduce((sum, item) => sum + (item.weightKg || 0), 0);
      const totalDiscount = items.reduce((sum, item) => sum + (item.discount || 0), 0);
      const totalTax = items.reduce((sum, item) => sum + (item.tax || 0), 0);

      return {
        ...sale,
        totalWeight,
        totalDiscount,
        totalTax,
        itemCount: items.length,
        customerName: sale.customer?.name || "Walk-in",
      };
    });

    // ─── 3. Product breakdown (DB aggregated) ──────────────────
    let productBreakdown = [];
    if (includeProductBreakdown) {
      const itemRepo = AppDataSource.getRepository(SaleItem);
      const productQb = itemRepo
        .createQueryBuilder("item")
        .innerJoin("item.sale", "sale")
        .innerJoin("item.meat", "meat")
        .select("item.meatId", "meatId")
        .addSelect("meat.name", "meatName")
        .addSelect("meat.sku", "sku")
        .addSelect("COALESCE(SUM(item.weightKg), 0)", "totalWeight")
        .addSelect("COALESCE(SUM(item.lineTotal), 0)", "totalRevenue")
        .addSelect("COUNT(item.id)", "quantity")
        .addSelect("COALESCE(AVG(item.unitPrice), 0)", "averagePrice")
        .where("sale.status = :status", { status })
        .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end });

      if (meatId) productQb.andWhere("item.meatId = :meatId", { meatId });

      const productResults = await productQb
        .groupBy("item.meatId")
        .orderBy("totalRevenue", "DESC")
        .getRawMany();

      productBreakdown = productResults.map(row => ({
        meatId: row.meatId,
        meatName: row.meatName || "Unknown",
        sku: row.sku || "",
        totalWeight: parseFloat(row.totalWeight) || 0,
        totalRevenue: parseFloat(row.totalRevenue) || 0,
        quantity: parseInt(row.quantity, 10) || 0,
        averagePrice: parseFloat(row.averagePrice) || 0,
      }));
    }

    // ─── 4. Customer breakdown (DB aggregated) ──────────────────
    let customerBreakdown = [];
    if (includeCustomerBreakdown) {
      const customerQb = saleRepo
        .createQueryBuilder("sale")
        .leftJoin("sale.customer", "customer")
        .select("sale.customerId", "customerId")
        .addSelect("COALESCE(customer.name, 'Walk-in')", "customerName")
        .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "totalSpent")
        .addSelect("COUNT(sale.id)", "purchaseCount")
        .where("sale.status = :status", { status })
        .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end });

      if (paymentMethod) customerQb.andWhere("sale.paymentMethod = :paymentMethod");
      if (minAmount) customerQb.andWhere("sale.totalAmount >= :minAmount");
      if (maxAmount) customerQb.andWhere("sale.totalAmount <= :maxAmount");

      const customerResults = await customerQb
        .groupBy("sale.customerId")
        .orderBy("totalSpent", "DESC")
        .getRawMany();

      customerBreakdown = customerResults.map(row => ({
        customerId: row.customerId || "walk-in",
        customerName: row.customerName || "Walk-in",
        totalSpent: parseFloat(row.totalSpent) || 0,
        purchaseCount: parseInt(row.purchaseCount, 10) || 0,
        averageTicket: parseInt(row.purchaseCount, 10) > 0 ? parseFloat(row.totalSpent) / parseInt(row.purchaseCount, 10) : 0,
      }));
    }

    // ─── 5. Refund data (DB aggregated) ─────────────────────────
    let refunds = [];
    if (includeRefundData) {
      const refundRepo = AppDataSource.getRepository(ReturnRefund);
      const refundQb = refundRepo
        .createQueryBuilder("refund")
        .leftJoinAndSelect("refund.sale", "sale")
        .leftJoinAndSelect("refund.customer", "customer")
        .leftJoinAndSelect("refund.items", "items")
        .leftJoinAndSelect("items.meat", "meat")
        .where("refund.status = 'processed'")
        .andWhere("refund.createdAt >= :start AND refund.createdAt <= :end", { start, end });

      // Limit refunds to 1000 for performance
      refunds = await refundQb.limit(1000).getMany();
    }

    // ─── 6. Daily trend (DB aggregated) ─────────────────────────
    const dailyTrend = await getDailySalesTrend(start, end, status, paymentMethod, customerId);

    // ─── 7. Summary (DB aggregated) ─────────────────────────────
    const summary = await getSalesReportSummary(start, end, status, paymentMethod, customerId);

    return {
      status: true,
      message: "Sales report data retrieved successfully",
      data: {
        sales: enrichedSales,
        pagination: salesResult.pagination,
        summary,
        productBreakdown,
        customerBreakdown,
        topProducts: productBreakdown.slice(0, 10),
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

// ─── AGGREGATE HELPERS ─────────────────────────────────────

/**
 * Get daily sales trend using DB GROUP BY DATE
 */
async function getDailySalesTrend(start, end, status, paymentMethod, customerId) {
  const saleRepo = AppDataSource.getRepository(Sale);

  const qb = saleRepo
    .createQueryBuilder("sale")
    .select("DATE(sale.timestamp)", "date")
    .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "revenue")
    .addSelect("COUNT(sale.id)", "count")
    .where("sale.status = :status", { status })
    .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end });

  if (paymentMethod) qb.andWhere("sale.paymentMethod = :paymentMethod");
  if (customerId) qb.andWhere("sale.customerId = :customerId");

  const trend = await qb
    .groupBy("DATE(sale.timestamp)")
    .orderBy("date", "ASC")
    .getRawMany();

  // Fill missing dates
  const result = [];
  const current = new Date(start);
  const trendMap = {};
  trend.forEach(row => {
    trendMap[row.date] = {
      revenue: parseFloat(row.revenue) || 0,
      count: parseInt(row.count, 10) || 0,
    };
  });

  while (current <= end) {
    const key = current.toISOString().split("T")[0];
    result.push({
      date: key,
      revenue: trendMap[key]?.revenue || 0,
      count: trendMap[key]?.count || 0,
      weight: 0, // weight needs join with sale items, can be added separately
    });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

/**
 * Get sales report summary using DB aggregates
 */
async function getSalesReportSummary(start, end, status, paymentMethod, customerId) {
  const saleRepo = AppDataSource.getRepository(Sale);
  const refundRepo = AppDataSource.getRepository(ReturnRefund);

  // Sales summary
  const qb = saleRepo
    .createQueryBuilder("sale")
    .select([
      "COUNT(sale.id) AS totalTransactions",
      "COALESCE(SUM(sale.totalAmount), 0) AS totalRevenue",
      "COALESCE(SUM(sale.totalDiscount), 0) AS totalDiscounts",
      "COALESCE(AVG(sale.totalAmount), 0) AS averageTicket",
    ])
    .where("sale.status = :status", { status })
    .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end });

  if (paymentMethod) qb.andWhere("sale.paymentMethod = :paymentMethod");
  if (customerId) qb.andWhere("sale.customerId = :customerId");

  const salesSummary = await qb.getRawOne();

  // Refunds summary
  const refundQb = refundRepo
    .createQueryBuilder("refund")
    .select("COALESCE(SUM(refund.totalAmount), 0) AS totalRefunds")
    .where("refund.status = 'processed'")
    .andWhere("refund.createdAt >= :start AND refund.createdAt <= :end", { start, end });

  const refundSummary = await refundQb.getRawOne();

  // Payment method breakdown
  const paymentQb = saleRepo
    .createQueryBuilder("sale")
    .select("sale.paymentMethod", "method")
    .addSelect("COUNT(sale.id)", "count")
    .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "total")
    .where("sale.status = :status", { status })
    .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end });

  if (paymentMethod) paymentQb.andWhere("sale.paymentMethod = :paymentMethod");
  if (customerId) paymentQb.andWhere("sale.customerId = :customerId");

  const paymentResults = await paymentQb
    .groupBy("sale.paymentMethod")
    .getRawMany();

  const paymentMethods = {};
  paymentResults.forEach(row => {
    paymentMethods[row.method || "unknown"] = {
      count: parseInt(row.count, 10) || 0,
      total: parseFloat(row.total) || 0,
    };
  });

  const totalTransactions = parseInt(salesSummary.totalTransactions, 10) || 0;
  const totalRevenue = parseFloat(salesSummary.totalRevenue) || 0;
  const totalRefunds = parseFloat(refundSummary.totalRefunds) || 0;
  const totalDiscounts = parseFloat(salesSummary.totalDiscounts) || 0;
  const averageTicket = parseFloat(salesSummary.averageTicket) || 0;
  const netRevenue = totalRevenue - totalRefunds;

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