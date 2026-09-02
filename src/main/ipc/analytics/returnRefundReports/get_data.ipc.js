// src/main/ipc/analytics/returnRefundReports/get_data.ipc.js
//@ts-check
const { AppDataSource } = require("../../../db/data-source");
const ReturnRefund = require("../../../../entities/ReturnRefund");
const ReturnRefundItem = require("../../../../entities/ReturnRefundItem");
const { paginateQueryBuilder } = require("../../../../utils/dbUtils/pagination");

module.exports = async (params) => {
  const {
    startDate,
    endDate,
    status,
    refundMethod,
    customerId,
    saleId,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "DESC",
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

    const returnRepo = AppDataSource.getRepository(ReturnRefund);

    // ─── 1. Build main return query with pagination ──────────────
    const qb = returnRepo
      .createQueryBuilder("returnRefund")
      .leftJoinAndSelect("returnRefund.sale", "sale")
      .leftJoinAndSelect("returnRefund.customer", "customer")
      .leftJoinAndSelect("returnRefund.items", "items")
      .leftJoinAndSelect("items.meat", "meat")
      .where("returnRefund.createdAt >= :start AND returnRefund.createdAt <= :end", { start, end });

    if (status) qb.andWhere("returnRefund.status = :status", { status });
    if (refundMethod) qb.andWhere("returnRefund.refundMethod = :refundMethod", { refundMethod });
    if (customerId) qb.andWhere("returnRefund.customerId = :customerId", { customerId });
    if (saleId) qb.andWhere("returnRefund.saleId = :saleId", { saleId });

    const allowedSortColumns = ["id", "referenceNo", "totalAmount", "status", "createdAt", "updatedAt"];
    const sortBySafe = allowedSortColumns.includes(sortBy) ? sortBy : "createdAt";
    const sortOrderSafe = sortOrder === "ASC" ? "ASC" : "DESC";

    const returnResult = await paginateQueryBuilder(qb, {
      page,
      limit,
      sortBy: sortBySafe,
      sortOrder: sortOrderSafe,
    });
    const returns = returnResult.data || [];

    // ─── 2. Enrich returns with computed fields (already joined) ──
    const enrichedReturns = returns.map(ret => {
      const items = ret.items || [];
      const totalWeight = items.reduce((sum, item) => sum + (item.weightKg || 0), 0);
      return {
        ...ret,
        totalWeight,
        customerName: ret.customer?.name || "Unknown",
        saleReference: ret.sale?.referenceNo || ret.saleId,
      };
    });

    // ─── 3. Summary (DB-aggregated) ──────────────────────────────
    const summary = await getReturnSummary(start, end, status, refundMethod, customerId, saleId);

    // ─── 4. Top items returned (DB-aggregated) ──────────────────
    const topItems = await getTopReturnedItems(start, end);

    // ─── 5. Reason breakdown (DB-aggregated) ────────────────────
    const reasonBreakdown = await getReasonBreakdown(start, end);

    // ─── 6. Daily trend (DB-aggregated) ─────────────────────────
    const dailyTrend = await getDailyReturnTrend(start, end);

    return {
      status: true,
      message: "Return refund data retrieved successfully",
      data: {
        returns: enrichedReturns,
        pagination: returnResult.pagination,
        summary,
        topItems,
        reasonBreakdown,
        dailyTrend,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    };
  } catch (error) {
    console.error("Error in getReturnRefundData:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve return refund data",
      data: null,
    };
  }
};

// ─── AGGREGATE HELPERS ─────────────────────────────────────

/**
 * Get return summary using DB aggregates
 */
async function getReturnSummary(start, end, status, refundMethod, customerId, saleId) {
  const returnRepo = AppDataSource.getRepository(ReturnRefund);

  // Build base query with filters
  const baseQb = returnRepo
    .createQueryBuilder("returnRefund")
    .where("returnRefund.createdAt >= :start AND returnRefund.createdAt <= :end", { start, end });

  if (status) baseQb.andWhere("returnRefund.status = :status", { status });
  if (refundMethod) baseQb.andWhere("returnRefund.refundMethod = :refundMethod", { refundMethod });
  if (customerId) baseQb.andWhere("returnRefund.customerId = :customerId", { customerId });
  if (saleId) baseQb.andWhere("returnRefund.saleId = :saleId", { saleId });

  // 1. Totals and counts
  const totals = await baseQb
    .clone()
    .select([
      "COUNT(returnRefund.id) AS totalReturns",
      "COALESCE(SUM(returnRefund.totalAmount), 0) AS totalAmount",
      "COALESCE(AVG(returnRefund.totalAmount), 0) AS avgAmount",
      "COUNT(DISTINCT returnRefund.customerId) AS uniqueCustomers",
    ])
    .getRawOne();

  // 2. Status breakdown
  const statusBreakdown = await baseQb
    .clone()
    .select("returnRefund.status", "status")
    .addSelect("COUNT(returnRefund.id)", "count")
    .groupBy("returnRefund.status")
    .getRawMany();

  const statusMap = { processed: 0, pending: 0, cancelled: 0 };
  statusBreakdown.forEach(row => {
    if (row.status in statusMap) statusMap[row.status] = parseInt(row.count, 10) || 0;
  });

  // 3. Processed amount (only processed returns)
  const processedAmount = await baseQb
    .clone()
    .select("COALESCE(SUM(returnRefund.totalAmount), 0) AS processedAmount")
    .andWhere("returnRefund.status = 'processed'")
    .getRawOne();

  // 4. Refund method breakdown
  const methodBreakdown = await baseQb
    .clone()
    .select("returnRefund.refundMethod", "method")
    .addSelect("COUNT(returnRefund.id)", "count")
    .where("returnRefund.refundMethod IS NOT NULL")
    .groupBy("returnRefund.refundMethod")
    .getRawMany();

  const methodMap = {};
  methodBreakdown.forEach(row => {
    methodMap[row.method || "unknown"] = parseInt(row.count, 10) || 0;
  });

  return {
    totalReturns: parseInt(totals.totalReturns, 10) || 0,
    totalAmount: parseFloat(totals.totalAmount) || 0,
    processedCount: statusMap.processed,
    pendingCount: statusMap.pending,
    cancelledCount: statusMap.cancelled,
    processedAmount: parseFloat(processedAmount.processedAmount) || 0,
    avgAmount: parseFloat(totals.avgAmount) || 0,
    methodBreakdown: methodMap,
    uniqueCustomers: parseInt(totals.uniqueCustomers, 10) || 0,
  };
}

/**
 * Get top returned items using DB aggregation (group by meat)
 */
async function getTopReturnedItems(start, end) {
  const itemRepo = AppDataSource.getRepository(ReturnRefundItem);

  const top = await itemRepo
    .createQueryBuilder("item")
    .innerJoin("item.returnRefund", "returnRefund")
    .innerJoin("item.meat", "meat")
    .select("item.meatId", "meatId")
    .addSelect("meat.name", "meatName")
    .addSelect("COALESCE(SUM(item.weightKg), 0)", "totalWeight")
    .addSelect("COALESCE(SUM(item.subtotal), 0)", "totalAmount")
    .addSelect("COUNT(item.id)", "count")
    .where("returnRefund.status = 'processed'")
    .andWhere("returnRefund.createdAt >= :start AND returnRefund.createdAt <= :end", { start, end })
    .groupBy("item.meatId")
    .orderBy("totalAmount", "DESC")
    .limit(10)
    .getRawMany();

  return top.map(row => ({
    meatId: row.meatId,
    meatName: row.meatName || "Unknown",
    totalWeight: parseFloat(row.totalWeight) || 0,
    totalAmount: parseFloat(row.totalAmount) || 0,
    count: parseInt(row.count, 10) || 0,
  }));
}

/**
 * Get return reasons breakdown using DB grouping
 */
async function getReasonBreakdown(start, end) {
  const returnRepo = AppDataSource.getRepository(ReturnRefund);

  const reasons = await returnRepo
    .createQueryBuilder("returnRefund")
    .select("returnRefund.reason", "reason")
    .addSelect("COUNT(returnRefund.id)", "count")
    .where("returnRefund.createdAt >= :start AND returnRefund.createdAt <= :end", { start, end })
    .andWhere("returnRefund.reason IS NOT NULL")
    .groupBy("returnRefund.reason")
    .orderBy("count", "DESC")
    .getRawMany();

  return reasons.map(row => ({
    reason: row.reason || "No reason provided",
    count: parseInt(row.count, 10) || 0,
  }));
}

/**
 * Get daily return trend using DB GROUP BY DATE
 */
async function getDailyReturnTrend(start, end) {
  const returnRepo = AppDataSource.getRepository(ReturnRefund);

  const trend = await returnRepo
    .createQueryBuilder("returnRefund")
    .select("DATE(returnRefund.createdAt)", "date")
    .addSelect("COUNT(returnRefund.id)", "count")
    .addSelect("COALESCE(SUM(returnRefund.totalAmount), 0)", "amount")
    .where("returnRefund.createdAt >= :start AND returnRefund.createdAt <= :end", { start, end })
    .groupBy("DATE(returnRefund.createdAt)")
    .orderBy("date", "ASC")
    .getRawMany();

  // Fill missing dates
  const result = [];
  const current = new Date(start);
  const trendMap = {};
  trend.forEach(row => {
    trendMap[row.date] = {
      count: parseInt(row.count, 10) || 0,
      amount: parseFloat(row.amount) || 0,
    };
  });

  while (current <= end) {
    const key = current.toISOString().split("T")[0];
    result.push({
      date: key,
      count: trendMap[key]?.count || 0,
      amount: trendMap[key]?.amount || 0,
    });
    current.setDate(current.getDate() + 1);
  }

  return result;
}