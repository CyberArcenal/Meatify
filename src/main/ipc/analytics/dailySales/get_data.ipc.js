// src/main/ipc/analytics/dailySales/get_data.ipc.js
const { AppDataSource } = require("../../../db/data-source");
const Sale = require("../../../../entities/Sale");
const SaleItem = require("../../../../entities/SaleItem");
const Meat = require("../../../../entities/Meat");

module.exports = async (params) => {
  const { 
    date,
    startDate,
    endDate,
    page = 1, 
    limit = 20, 
    sortBy = "timestamp", 
    sortOrder = "DESC",
    paymentMethod,
    customerId,
    status = "paid",
    minAmount,
    maxAmount,
  } = params;

  try {
    // Determine date range
    let start, end;
    if (date) {
      start = new Date(date);
      start.setHours(0, 0, 0, 0);
      end = new Date(date);
      end.setHours(23, 59, 59, 999);
    } else if (startDate && endDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      // Default to today
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    const saleRepo = AppDataSource.getRepository(Sale);
    const saleItemRepo = AppDataSource.getRepository(SaleItem);
    const meatRepo = AppDataSource.getRepository(Meat);

    // ─── 1. Get paginated sales ──────────────────────────────
    const qb = saleRepo
      .createQueryBuilder("sale")
      .leftJoinAndSelect("sale.customer", "customer")
      .leftJoinAndSelect("sale.saleItems", "items")
      .leftJoinAndSelect("items.meat", "meat")
      .where("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
      .andWhere("sale.status = :status", { status });

    if (paymentMethod) {
      qb.andWhere("sale.paymentMethod = :paymentMethod", { paymentMethod });
    }
    if (customerId) {
      qb.andWhere("sale.customerId = :customerId", { customerId });
    }
    if (minAmount !== undefined) {
      qb.andWhere("sale.totalAmount >= :minAmount", { minAmount });
    }
    if (maxAmount !== undefined) {
      qb.andWhere("sale.totalAmount <= :maxAmount", { maxAmount });
    }

    const validSortColumns = ["timestamp", "totalAmount", "paymentMethod", "status"];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : "timestamp";
    const order = sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`sale.${sortColumn}`, order);

    const [sales, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Enrich sales with computed totals (weight, discount, tax)
    const enrichedSales = sales.map(sale => {
      const items = sale.saleItems || [];
      const totalWeight = items.reduce((sum, item) => sum + parseFloat(item.weightKg || 0), 0);
      const totalDiscount = items.reduce((sum, item) => sum + parseFloat(item.discount || 0), 0);
      const totalTax = items.reduce((sum, item) => sum + parseFloat(item.tax || 0), 0);
      return {
        ...sale,
        totalWeight: parseFloat(totalWeight.toFixed(3)),
        totalDiscount: parseFloat(totalDiscount.toFixed(2)),
        totalTax: parseFloat(totalTax.toFixed(2)),
        customerName: sale.customer?.name || "Walk-in",
      };
    });

    // ─── 2. Summary statistics (aggregated) ──────────────────
    const summary = await getDailySummary(start, end, status, paymentMethod, customerId);

    // ─── 3. Hourly breakdown ──────────────────────────────────
    const hourlyBreakdown = await getHourlyBreakdown(start, end, status, paymentMethod, customerId);

    // ─── 4. Top selling meats ────────────────────────────────
    const topMeats = await getTopMeats(start, end, status, paymentMethod, customerId);

    return {
      status: true,
      message: "Daily sales data retrieved successfully",
      data: {
        sales: enrichedSales,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        summary,
        hourlyBreakdown,
        topMeats,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    };
  } catch (error) {
    console.error("Error in getDailySalesData:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve daily sales data",
      data: null,
    };
  }
};

// ─── Helper: Daily Summary (uses DB aggregates) ────────────────
async function getDailySummary(start, end, status, paymentMethod, customerId) {
  const saleRepo = AppDataSource.getRepository(Sale);
  const saleItemRepo = AppDataSource.getRepository(SaleItem);

  // 1. Sales aggregate
  const saleQb = saleRepo
    .createQueryBuilder("sale")
    .select("COUNT(sale.id)", "totalSales")
    .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "totalRevenue")
    .addSelect("COALESCE(SUM(sale.totalDiscount), 0)", "totalDiscount")
    .addSelect("COUNT(DISTINCT sale.customerId)", "uniqueCustomers")
    .where("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
    .andWhere("sale.status = :status", { status });

  if (paymentMethod) {
    saleQb.andWhere("sale.paymentMethod = :paymentMethod", { paymentMethod });
  }
  if (customerId) {
    saleQb.andWhere("sale.customerId = :customerId", { customerId });
  }

  const saleAgg = await saleQb.getRawOne();

  // 2. Payment method breakdown
  const paymentQb = saleRepo
    .createQueryBuilder("sale")
    .select("sale.paymentMethod", "method")
    .addSelect("COUNT(sale.id)", "count")
    .where("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
    .andWhere("sale.status = :status", { status });

  if (paymentMethod) {
    paymentQb.andWhere("sale.paymentMethod = :paymentMethod", { paymentMethod });
  }
  if (customerId) {
    paymentQb.andWhere("sale.customerId = :customerId", { customerId });
  }

  const paymentMethods = await paymentQb.groupBy("sale.paymentMethod").getRawMany();

  // 3. Total weight (from sale items)
  const itemQb = saleItemRepo
    .createQueryBuilder("item")
    .leftJoin("item.sale", "sale")
    .select("COALESCE(SUM(item.weightKg), 0)", "totalWeight")
    .where("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
    .andWhere("sale.status = :status", { status });

  if (paymentMethod) {
    itemQb.andWhere("sale.paymentMethod = :paymentMethod", { paymentMethod });
  }
  if (customerId) {
    itemQb.andWhere("sale.customerId = :customerId", { customerId });
  }

  const itemAgg = await itemQb.getRawOne();

  const totalSales = parseInt(saleAgg.totalSales, 10) || 0;
  const totalRevenue = parseFloat(saleAgg.totalRevenue) || 0;
  const totalDiscount = parseFloat(saleAgg.totalDiscount) || 0;
  const totalWeight = parseFloat(itemAgg.totalWeight) || 0;
  const uniqueCustomers = parseInt(saleAgg.uniqueCustomers, 10) || 0;

  return {
    totalSales,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    averageTicket: totalSales > 0 ? parseFloat((totalRevenue / totalSales).toFixed(2)) : 0,
    totalWeight: parseFloat(totalWeight.toFixed(3)),
    totalDiscount: parseFloat(totalDiscount.toFixed(2)),
    uniqueCustomers,
    paymentMethods: paymentMethods.reduce((acc, row) => {
      acc[row.method] = parseInt(row.count, 10);
      return acc;
    }, {}),
  };
}

// ─── Helper: Hourly Breakdown ─────────────────────────────────────
async function getHourlyBreakdown(start, end, status, paymentMethod, customerId) {
  const saleRepo = AppDataSource.getRepository(Sale);

  // For SQLite, we can use strftime to extract hour, but we also need to handle other DBs.
  // Use a simple approach: fetch sales and group in JS since we only need 24 hours and we can aggregate with SQL.
  // Better: use raw SQL for SQLite: "strftime('%H', sale.timestamp) as hour"
  // We'll use a query builder with a raw expression.
  const qb = saleRepo
    .createQueryBuilder("sale")
    .select("strftime('%H', sale.timestamp)", "hour")
    .addSelect("COUNT(sale.id)", "count")
    .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "revenue")
    .where("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
    .andWhere("sale.status = :status", { status })
    .groupBy("strftime('%H', sale.timestamp)");

  if (paymentMethod) {
    qb.andWhere("sale.paymentMethod = :paymentMethod", { paymentMethod });
  }
  if (customerId) {
    qb.andWhere("sale.customerId = :customerId", { customerId });
  }

  const rows = await qb.getRawMany();

  // Initialize all 24 hours
  const hourlyMap = {};
  for (let i = 0; i < 24; i++) {
    hourlyMap[i] = { count: 0, revenue: 0, weight: 0 };
  }

  rows.forEach(row => {
    const hour = parseInt(row.hour, 10);
    if (!isNaN(hour) && hour >= 0 && hour < 24) {
      hourlyMap[hour].count = parseInt(row.count, 10) || 0;
      hourlyMap[hour].revenue = parseFloat(row.revenue) || 0;
    }
  });

  // For weight, we need a separate query: sum item weight per hour
  const itemRepo = AppDataSource.getRepository(SaleItem);
  const itemQb = itemRepo
    .createQueryBuilder("item")
    .leftJoin("item.sale", "sale")
    .select("strftime('%H', sale.timestamp)", "hour")
    .addSelect("COALESCE(SUM(item.weightKg), 0)", "totalWeight")
    .where("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
    .andWhere("sale.status = :status", { status })
    .groupBy("strftime('%H', sale.timestamp)");

  if (paymentMethod) {
    itemQb.andWhere("sale.paymentMethod = :paymentMethod", { paymentMethod });
  }
  if (customerId) {
    itemQb.andWhere("sale.customerId = :customerId", { customerId });
  }

  const weightRows = await itemQb.getRawMany();
  weightRows.forEach(row => {
    const hour = parseInt(row.hour, 10);
    if (!isNaN(hour) && hour >= 0 && hour < 24) {
      hourlyMap[hour].weight = parseFloat(row.totalWeight) || 0;
    }
  });

  // Convert to array
  return Object.entries(hourlyMap).map(([hour, data]) => ({
    hour: parseInt(hour),
    count: data.count,
    revenue: parseFloat(data.revenue.toFixed(2)),
    weight: parseFloat(data.weight.toFixed(3)),
  }));
}

// ─── Helper: Top Meats ────────────────────────────────────────────
async function getTopMeats(start, end, status, paymentMethod, customerId) {
  const saleItemRepo = AppDataSource.getRepository(SaleItem);

  const qb = saleItemRepo
    .createQueryBuilder("item")
    .innerJoin("item.sale", "sale")
    .innerJoin("item.meat", "meat")
    .select("item.meatId", "meatId")
    .addSelect("meat.name", "meatName")
    .addSelect("COALESCE(SUM(item.weightKg), 0)", "totalWeight")
    .addSelect("COALESCE(SUM(item.lineTotal), 0)", "totalRevenue")
    .addSelect("COUNT(item.id)", "count")
    .where("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
    .andWhere("sale.status = :status", { status })
    .groupBy("item.meatId")
    .orderBy("totalRevenue", "DESC")
    .limit(10);

  if (paymentMethod) {
    qb.andWhere("sale.paymentMethod = :paymentMethod", { paymentMethod });
  }
  if (customerId) {
    qb.andWhere("sale.customerId = :customerId", { customerId });
  }

  const rows = await qb.getRawMany();

  return rows.map(row => ({
    meatId: row.meatId,
    meatName: row.meatName || "Unknown",
    totalWeight: parseFloat(row.totalWeight) || 0,
    totalRevenue: parseFloat(row.totalRevenue) || 0,
    count: parseInt(row.count, 10) || 0,
  }));
}