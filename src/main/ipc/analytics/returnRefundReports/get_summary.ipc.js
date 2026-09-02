// src/main/ipc/analytics/returnRefundReports/get_summary.ipc.js
//@ts-check
const { AppDataSource } = require("../../../db/data-source");
const ReturnRefund = require("../../../../entities/ReturnRefund");
const Sale = require("../../../../entities/Sale");

module.exports = async (params) => {
  const { period = "month", status = "processed" } = params || {};

  try {
    const now = new Date();
    let start, end;

    switch (period) {
      case "today":
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case "week":
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case "month":
        start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case "quarter":
        start = new Date(now);
        start.setMonth(now.getMonth() - 3);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case "year":
        start = new Date(now);
        start.setFullYear(now.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
    }

    const returnRepo = AppDataSource.getRepository(ReturnRefund);
    const saleRepo = AppDataSource.getRepository(Sale);

    // ─── 1. Returns summary ──────────────────────────────────────
    const returnQb = returnRepo
      .createQueryBuilder("returnRefund")
      .where("returnRefund.createdAt >= :start AND returnRefund.createdAt <= :end", { start, end });

    if (status) returnQb.andWhere("returnRefund.status = :status", { status });

    const returnTotals = await returnQb
      .clone()
      .select([
        "COUNT(returnRefund.id) AS totalReturns",
        "COALESCE(SUM(returnRefund.totalAmount), 0) AS totalAmount",
        "COALESCE(AVG(returnRefund.totalAmount), 0) AS avgRefund",
      ])
      .getRawOne();

    // Status breakdown
    const statusBreakdown = await returnQb
      .clone()
      .select("returnRefund.status", "status")
      .addSelect("COUNT(returnRefund.id)", "count")
      .groupBy("returnRefund.status")
      .getRawMany();

    const statusMap = {};
    statusBreakdown.forEach(row => {
      statusMap[row.status] = parseInt(row.count, 10) || 0;
    });

    // Refund method breakdown
    const methodBreakdown = await returnQb
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

    // Top customers by return count
    const topCustomers = await returnQb
      .clone()
      .leftJoin("returnRefund.customer", "customer")
      .select("returnRefund.customerId", "customerId")
      .addSelect("customer.name", "customerName")
      .addSelect("COUNT(returnRefund.id)", "count")
      .addSelect("COALESCE(SUM(returnRefund.totalAmount), 0)", "totalAmount")
      .where("returnRefund.customerId IS NOT NULL")
      .groupBy("returnRefund.customerId")
      .orderBy("count", "DESC")
      .limit(5)
      .getRawMany();

    // ─── 2. Sales summary for return rate ────────────────────────
    const salesTotals = await saleRepo
      .createQueryBuilder("sale")
      .select([
        "COUNT(sale.id) AS totalSalesCount",
        "COALESCE(SUM(sale.totalAmount), 0) AS totalSalesAmount",
      ])
      .where("sale.status = 'paid'")
      .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
      .getRawOne();

    const totalReturns = parseInt(returnTotals.totalReturns, 10) || 0;
    const totalReturnsAmount = parseFloat(returnTotals.totalAmount) || 0;
    const totalSalesCount = parseInt(salesTotals.totalSalesCount, 10) || 0;
    const totalSalesAmount = parseFloat(salesTotals.totalSalesAmount) || 0;

    // Return rate
    const returnRateByCount = totalSalesCount > 0 ? (totalReturns / totalSalesCount) * 100 : 0;
    const returnRateByAmount = totalSalesAmount > 0 ? (totalReturnsAmount / totalSalesAmount) * 100 : 0;

    // ─── 3. Previous period comparison ──────────────────────────
    const diff = end - start;
    const prevStart = new Date(start);
    prevStart.setTime(prevStart.getTime() - diff);
    const prevEnd = new Date(end);
    prevEnd.setTime(prevEnd.getTime() - diff);

    const prevReturns = await returnRepo
      .createQueryBuilder("returnRefund")
      .select([
        "COUNT(returnRefund.id) AS count",
        "COALESCE(SUM(returnRefund.totalAmount), 0) AS amount",
      ])
      .where("returnRefund.createdAt >= :prevStart AND returnRefund.createdAt <= :prevEnd", { prevStart, prevEnd })
      .andWhere("returnRefund.status = :status", { status })
      .getRawOne();

    const prevReturnsCount = parseInt(prevReturns.count, 10) || 0;
    const prevReturnsAmount = parseFloat(prevReturns.amount) || 0;

    const returnCountChange = prevReturnsCount > 0 ? ((totalReturns - prevReturnsCount) / prevReturnsCount) * 100 : 0;
    const returnAmountChange = prevReturnsAmount > 0 ? ((totalReturnsAmount - prevReturnsAmount) / prevReturnsAmount) * 100 : 0;

    return {
      status: true,
      message: "Return refund summary retrieved successfully",
      data: {
        period,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        summary: {
          totalReturns,
          totalReturnsAmount,
          totalSalesCount,
          totalSalesAmount,
          returnRateByCount,
          returnRateByAmount,
          avgRefund: parseFloat(returnTotals.avgRefund) || 0,
          statusBreakdown: statusMap,
          methodBreakdown: methodMap,
          topCustomers: topCustomers.map(row => ({
            customerId: row.customerId,
            customerName: row.customerName || "Unknown",
            count: parseInt(row.count, 10) || 0,
            totalAmount: parseFloat(row.totalAmount) || 0,
          })),
        },
        comparison: {
          previousReturnsCount: prevReturnsCount,
          previousReturnsAmount: prevReturnsAmount,
          returnCountChange,
          returnAmountChange,
        },
      },
    };
  } catch (error) {
    console.error("Error in getReturnRefundSummary:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve return refund summary",
      data: null,
    };
  }
};