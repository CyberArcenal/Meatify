// src/main/ipc/dashboard/get_customer_stats.ipc.js
//@ts-check
const { AppDataSource } = require("../../../db/data-source");
const Customer = require("../../../../entities/Customer");
const Sale = require("../../../../entities/Sale");

module.exports = async (params) => {
  try {
    const customerRepo = AppDataSource.getRepository(Customer);
    const saleRepo = AppDataSource.getRepository(Sale);

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Total active customers
    const totalCustomers = await customerRepo.count({ where: { isActive: true } });

    // 2. New customers today
    const newToday = await customerRepo
      .createQueryBuilder("customer")
      .where("customer.createdAt >= :start AND customer.createdAt <= :end", {
        start: startOfDay,
        end: endOfDay,
      })
      .getCount();

    // 3. New customers this week
    const startOfWeek = new Date(today);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);
    const newWeek = await customerRepo
      .createQueryBuilder("customer")
      .where("customer.createdAt >= :start", { start: startOfWeek })
      .getCount();

    // 4. Top spenders (group by customer, sum totalAmount from paid sales)
    const topSpenders = await saleRepo
      .createQueryBuilder("sale")
      .select("sale.customerId", "customerId")
      .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "totalSpent")
      .addSelect("customer.name", "name")
      .innerJoin("sale.customer", "customer")
      .where("sale.status = 'paid'")
      .andWhere("customer.isActive = true")
      .groupBy("sale.customerId")
      .orderBy("totalSpent", "DESC")
      .limit(5)
      .getRawMany();

    // 5. Loyalty distribution
    const distribution = await customerRepo
      .createQueryBuilder("customer")
      .select(
        `CASE 
          WHEN customer.loyaltyPointsBalance <= 100 THEN '0-100'
          WHEN customer.loyaltyPointsBalance <= 500 THEN '101-500'
          WHEN customer.loyaltyPointsBalance <= 1000 THEN '501-1000'
          ELSE '1000+'
        END`,
        "range"
      )
      .addSelect("COUNT(customer.id)", "count")
      .where("customer.isActive = true")
      .groupBy("range")
      .getRawMany();

    // Format distribution
    const loyaltyDistribution = [
      { range: "0-100", count: 0 },
      { range: "101-500", count: 0 },
      { range: "501-1000", count: 0 },
      { range: "1000+", count: 0 },
    ];
    distribution.forEach(row => {
      const found = loyaltyDistribution.find(d => d.range === row.range);
      if (found) found.count = parseInt(row.count, 10) || 0;
    });

    return {
      status: true,
      message: "Customer stats retrieved successfully",
      data: {
        totalCustomers,
        newCustomersToday: newToday,
        newCustomersThisWeek: newWeek,
        topSpenders: topSpenders.map(row => ({
          customerId: row.customerId,
          name: row.name || "Unknown",
          totalSpent: parseFloat(row.totalSpent) || 0,
        })),
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