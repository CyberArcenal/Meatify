// src/main/ipc/analytics/customerInsights/get_data.ipc.js
const { AppDataSource } = require("../../../db/data-source");
const Customer = require("../../../../entities/Customer");
const Sale = require("../../../../entities/Sale");
const LoyaltyTransaction = require("../../../../entities/LoyaltyTransaction");
const { paginateQueryBuilder } = require("../../../../utils/dbUtils/pagination");

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
    endDate,
  } = params;

  try {
    const customerRepo = AppDataSource.getRepository(Customer);
    const saleRepo = AppDataSource.getRepository(Sale);
    const loyaltyRepo = AppDataSource.getRepository(LoyaltyTransaction);

    // ─── MAIN CUSTOMER QUERY ─────────────────────────────────────
    const qb = customerRepo
      .createQueryBuilder("customer")
      .where("customer.isActive = :isActive", { isActive });

    if (search) {
      qb.andWhere(
        "(customer.name LIKE :search OR customer.email LIKE :search OR customer.phone LIKE :search)",
        { search: `%${search}%` }
      );
    }
    if (status) {
      qb.andWhere("customer.status = :status", { status });
    }
    if (minPoints !== undefined) {
      qb.andWhere("customer.loyaltyPointsBalance >= :minPoints", { minPoints });
    }
    if (maxPoints !== undefined) {
      qb.andWhere("customer.loyaltyPointsBalance <= :maxPoints", { maxPoints });
    }

    // Pagination
    const customersResult = await paginateQueryBuilder(qb, {
      page,
      limit,
      orderBy: `customer.${sortBy}`,
      sortDirection: sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC",
    });

    const customers = customersResult.data;

    // If no customers, return early
    if (customers.length === 0) {
      return {
        status: true,
        message: "No customers found",
        data: {
          customers: [],
          pagination: customersResult.pagination,
          summary: await getSummaryData(startDate, endDate),
        },
      };
    }

    const customerIds = customers.map(c => c.id);

    // ─── BATCH QUERIES FOR COMPUTED FIELDS ──────────────────────

    // 1. Total spent and purchase count per customer (from paid sales)
    const salesAgg = await saleRepo
      .createQueryBuilder("sale")
      .select("sale.customerId", "customerId")
      .addSelect("COUNT(sale.id)", "purchaseCount")
      .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "totalSpent")
      .where("sale.customerId IN (:...ids)", { ids: customerIds })
      .andWhere("sale.status = 'paid'")
      .groupBy("sale.customerId")
      .getRawMany();

    const salesMap = new Map();
    salesAgg.forEach(row => {
      salesMap.set(row.customerId, {
        purchaseCount: parseInt(row.purchaseCount, 10) || 0,
        totalSpent: parseFloat(row.totalSpent) || 0,
      });
    });

    // 2. Loyalty earned and redeemed
    const loyaltyAgg = await loyaltyRepo
      .createQueryBuilder("tx")
      .select("tx.customerId", "customerId")
      .addSelect(
        `SUM(CASE WHEN tx.transactionType = 'earn' THEN tx.pointsChange ELSE 0 END)`,
        "totalEarned"
      )
      .addSelect(
        `SUM(CASE WHEN tx.transactionType = 'redeem' THEN ABS(tx.pointsChange) ELSE 0 END)`,
        "totalRedeemed"
      )
      .where("tx.customerId IN (:...ids)", { ids: customerIds })
      .groupBy("tx.customerId")
      .getRawMany();

    const loyaltyMap = new Map();
    loyaltyAgg.forEach(row => {
      loyaltyMap.set(row.customerId, {
        totalEarned: parseFloat(row.totalEarned) || 0,
        totalRedeemed: parseFloat(row.totalRedeemed) || 0,
      });
    });

    // 3. Last purchase date per customer
    const lastPurchaseAgg = await saleRepo
      .createQueryBuilder("sale")
      .select("sale.customerId", "customerId")
      .addSelect("MAX(sale.timestamp)", "lastPurchase")
      .where("sale.customerId IN (:...ids)", { ids: customerIds })
      .andWhere("sale.status = 'paid'")
      .groupBy("sale.customerId")
      .getRawMany();

    const lastPurchaseMap = new Map();
    lastPurchaseAgg.forEach(row => {
      lastPurchaseMap.set(row.customerId, row.lastPurchase || null);
    });

    // ─── ENRICH CUSTOMERS ──────────────────────────────────────

    const enrichedCustomers = customers.map(customer => {
      const sales = salesMap.get(customer.id) || { purchaseCount: 0, totalSpent: 0 };
      const loyalty = loyaltyMap.get(customer.id) || { totalEarned: 0, totalRedeemed: 0 };
      const lastPurchase = lastPurchaseMap.get(customer.id) || null;

      return {
        ...customer,
        totalSpent: sales.totalSpent,
        purchaseCount: sales.purchaseCount,
        totalEarned: loyalty.totalEarned,
        totalRedeemed: loyalty.totalRedeemed,
        lastPurchase,
        averageTicket: sales.purchaseCount > 0 ? sales.totalSpent / sales.purchaseCount : 0,
      };
    });

    // ─── SUMMARY ──────────────────────────────────────────────

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
 * Get summary data for the insights dashboard (uses DB aggregates)
 */
async function getSummaryData(startDate, endDate) {
  try {
    const customerRepo = AppDataSource.getRepository(Customer);
    const saleRepo = AppDataSource.getRepository(Sale);

    // Total active customers
    const totalCustomers = await customerRepo.count({ where: { isActive: true } });

    // Active customers (have at least one paid sale)
    const activeCustomersQuery = saleRepo
      .createQueryBuilder("sale")
      .select("DISTINCT sale.customerId")
      .where("sale.status = 'paid'");

    if (startDate) {
      activeCustomersQuery.andWhere("sale.timestamp >= :startDate", { startDate });
    }
    if (endDate) {
      activeCustomersQuery.andWhere("sale.timestamp <= :endDate", { endDate });
    }

    const activeCustomerIds = await activeCustomersQuery.getRawMany();
    const activeCustomers = activeCustomerIds.length;

    // Total loyalty points across all customers
    const pointsAgg = await customerRepo
      .createQueryBuilder("customer")
      .select("SUM(customer.loyaltyPointsBalance)", "totalPoints")
      .where("customer.isActive = true")
      .getRawOne();
    const totalPoints = parseFloat(pointsAgg.totalPoints) || 0;

    const avgPoints = totalCustomers > 0 ? totalPoints / totalCustomers : 0;

    // VIP and Elite count
    const vipCount = await customerRepo.count({
      where: { isActive: true, status: "vip" },
    });
    const eliteCount = await customerRepo.count({
      where: { isActive: true, status: "elite" },
    });

    // New customers in period
    let newCustomers = 0;
    if (startDate) {
      const qb = customerRepo
        .createQueryBuilder("customer")
        .where("customer.isActive = true")
        .andWhere("customer.createdAt >= :startDate", { startDate });
      if (endDate) {
        qb.andWhere("customer.createdAt <= :endDate", { endDate });
      }
      newCustomers = await qb.getCount();
    }

    // Top 5 customers by total spent (requires sales aggregation)
    const topCustomers = await saleRepo
      .createQueryBuilder("sale")
      .select("sale.customerId", "customerId")
      .addSelect("customer.name", "name")
      .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "totalSpent")
      .innerJoin("sale.customer", "customer")
      .where("sale.status = 'paid'")
      .andWhere("customer.isActive = true")
      .groupBy("sale.customerId")
      .orderBy("totalSpent", "DESC")
      .limit(5)
      .getRawMany();

    return {
      totalCustomers,
      activeCustomers,
      totalPoints,
      avgPoints,
      vipCount,
      eliteCount,
      newCustomers,
      topCustomers: topCustomers.map(row => ({
        id: row.customerId,
        name: row.name || "Unknown",
        totalSpent: parseFloat(row.totalSpent) || 0,
        purchaseCount: 0, // not needed for summary
      })),
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