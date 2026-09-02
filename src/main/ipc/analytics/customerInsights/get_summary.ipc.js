// src/main/ipc/analytics/customerInsights/get_summary.ipc.js
const { AppDataSource } = require("../../../db/data-source");
const Customer = require("../../../../entities/Customer");
const Sale = require("../../../../entities/Sale");
const LoyaltyTransaction = require("../../../../entities/LoyaltyTransaction");

module.exports = async (params) => {
  const { startDate, endDate } = params || {};

  try {
    const customerRepo = AppDataSource.getRepository(Customer);
    const saleRepo = AppDataSource.getRepository(Sale);
    const loyaltyRepo = AppDataSource.getRepository(LoyaltyTransaction);

    // 1. Total active customers
    const totalCustomers = await customerRepo.count({ where: { isActive: true } });

    // 2. By status (using GROUP BY)
    const byStatusRaw = await customerRepo
      .createQueryBuilder("customer")
      .select("customer.status", "status")
      .addSelect("COUNT(customer.id)", "count")
      .where("customer.isActive = true")
      .groupBy("customer.status")
      .getRawMany();

    const byStatus = {
      regular: 0,
      vip: 0,
      elite: 0,
    };
    byStatusRaw.forEach(row => {
      byStatus[row.status] = parseInt(row.count, 10) || 0;
    });

    // 3. Loyalty points summary
    const pointsAgg = await customerRepo
      .createQueryBuilder("customer")
      .select("SUM(customer.loyaltyPointsBalance)", "total")
      .addSelect("AVG(customer.loyaltyPointsBalance)", "average")
      .addSelect("MAX(customer.loyaltyPointsBalance)", "max")
      .addSelect("MIN(customer.loyaltyPointsBalance)", "min")
      .where("customer.isActive = true")
      .getRawOne();

    const pointsSummary = {
      total: parseFloat(pointsAgg.total) || 0,
      average: parseFloat(pointsAgg.average) || 0,
      max: parseFloat(pointsAgg.max) || 0,
      min: parseFloat(pointsAgg.min) || 0,
    };

    // 4. Customers with points > 0
    const customersWithPoints = await customerRepo
      .createQueryBuilder("customer")
      .where("customer.isActive = true")
      .andWhere("customer.loyaltyPointsBalance > 0")
      .getCount();

    const customersWithoutPoints = totalCustomers - customersWithPoints;

    // 5. Top 10 customers by points
    const topCustomersByPoints = await customerRepo
      .createQueryBuilder("customer")
      .select([
        "customer.id",
        "customer.name",
        "customer.email",
        "customer.phone",
        "customer.loyaltyPointsBalance",
        "customer.status",
      ])
      .where("customer.isActive = true")
      .orderBy("customer.loyaltyPointsBalance", "DESC")
      .limit(10)
      .getMany();

    // 6. Active vs inactive (from the count above)
    const inactiveCount = await customerRepo.count({ where: { isActive: false } });

    return {
      status: true,
      message: "Customer insights summary retrieved successfully",
      data: {
        totalCustomers,
        byStatus,
        pointsSummary,
        customersWithPoints,
        customersWithoutPoints,
        topCustomersByPoints: topCustomersByPoints.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          points: c.loyaltyPointsBalance,
          status: c.status,
        })),
        activeCount: totalCustomers,
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