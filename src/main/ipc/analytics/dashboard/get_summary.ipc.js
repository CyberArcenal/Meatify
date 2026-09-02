// src/main/ipc/dashboard/get_summary.ipc.js
//@ts-check
const { AppDataSource } = require("../../../db/data-source");
const Sale = require("../../../../entities/Sale");
const Batch = require("../../../../entities/Batch");
const Meat = require("../../../../entities/Meat");
const Customer = require("../../../../entities/Customer");
const InventoryMovement = require("../../../../entities/InventoryMovement");

module.exports = async (params) => {
  try {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    const saleRepo = AppDataSource.getRepository(Sale);
    const batchRepo = AppDataSource.getRepository(Batch);
    const meatRepo = AppDataSource.getRepository(Meat);
    const customerRepo = AppDataSource.getRepository(Customer);
    const movementRepo = AppDataSource.getRepository(InventoryMovement);

    // 1. Today's sales (paid)
    const todaySales = await saleRepo
      .createQueryBuilder("sale")
      .select("COUNT(sale.id)", "count")
      .addSelect("COALESCE(SUM(sale.totalAmount), 0)", "revenue")
      .where("sale.status = 'paid'")
      .andWhere("sale.timestamp >= :start AND sale.timestamp <= :end", { start, end })
      .getRawOne();

    // 2. Total active customers
    const totalCustomers = await customerRepo.count({ where: { isActive: true } });

    // 3. Low stock count (batches with remaining <= threshold)
    const lowStockThreshold = 5; // can be fetched from system settings later
    const lowStockCount = await batchRepo
      .createQueryBuilder("batch")
      .where("batch.status = 'active'")
      .andWhere("batch.remainingQuantity <= :threshold", { threshold: lowStockThreshold })
      .getCount();

    // 4. Total active meat products
    const totalProducts = await meatRepo.count({ where: { isActive: true } });

    // 5. Inventory movements today
    const inventoryMovementsToday = await movementRepo
      .createQueryBuilder("movement")
      .where("movement.timestamp >= :start AND movement.timestamp <= :end", { start, end })
      .getCount();

    // 6. Expiring count (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const expiringCount = await batchRepo
      .createQueryBuilder("batch")
      .where("batch.status = 'active'")
      .andWhere("batch.expiryDate >= :today AND batch.expiryDate <= :expiryLimit", {
        today,
        expiryLimit: sevenDaysFromNow,
      })
      .getCount();

    return {
      status: true,
      message: "Dashboard summary retrieved successfully",
      data: {
        salesToday: parseInt(todaySales.count, 10) || 0,
        revenueToday: parseFloat(todaySales.revenue) || 0,
        totalCustomers,
        lowStockCount,
        totalProducts,
        inventoryMovementsToday,
        expiringCount,
        date: today.toISOString(),
      },
    };
  } catch (error) {
    console.error("Error in getDashboardSummary:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve dashboard summary",
      data: null,
    };
  }
};