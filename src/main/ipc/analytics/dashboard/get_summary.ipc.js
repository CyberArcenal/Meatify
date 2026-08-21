// src/main/ipc/dashboard/get_summary.ipc.js
//@ts-check
const saleService = require("../../../../services/Sale");
const customerService = require("../../../../services/Customer");
const batchService = require("../../../../services/Batch");
const meatService = require("../../../../services/Meat");
const inventoryMovementService = require("../../../../services/InventoryMovement");

module.exports = async (params) => {
  try {
    // Get today's date range
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    // Get today's sales (paid only)
    const salesOptions = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: "paid",
      limit: 10000,
    };
    const salesResult = await saleService.findAll(salesOptions);
    const sales = salesResult.data;
    const salesToday = sales.length;
    const revenueToday = sales.reduce((sum, s) => sum + s.totalAmount, 0);

    // Get total active customers
    const customerResult = await customerService.findAll({ isActive: true, limit: 1 });
    const totalCustomers = customerResult.pagination?.total || 0;

    // Get low stock count (batches with remaining < 5kg)
    const lowStockThreshold = 5;
    const batchOptions = {
      status: "active",
      maxRemaining: lowStockThreshold,
      includeInactive: false,
      limit: 10000,
    };
    const batchResult = await batchService.findAll(batchOptions);
    const lowStockCount = batchResult.data.length;

    // Get total active products (meats)
    const meatOptions = { isActive: true, limit: 1 };
    const meatResult = await meatService.findAll(meatOptions);
    const totalProducts = meatResult.pagination?.total || 0;

    // Get inventory movements today
    const movementOptions = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 10000,
    };
    const movementResult = await inventoryMovementService.findAll(movementOptions);
    const inventoryMovementsToday = movementResult.data.length;

    // Get expiring count (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const expiringOptions = {
      status: "active",
      expiryDateTo: sevenDaysFromNow.toISOString(),
      includeInactive: false,
      limit: 10000,
    };
    const expiringResult = await batchService.findAll(expiringOptions);
    const expiringCount = expiringResult.data.length;

    return {
      status: true,
      message: "Dashboard summary retrieved successfully",
      data: {
        salesToday,
        revenueToday,
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