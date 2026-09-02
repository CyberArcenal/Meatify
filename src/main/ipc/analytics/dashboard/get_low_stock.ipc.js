// src/main/ipc/dashboard/get_low_stock.ipc.js
//@ts-check
const batchService = require("../../../../services/Batch");
const meatService = require("../../../../services/Meat");

module.exports = async (params) => {
  const { threshold = 5, limit = 10 } = params;

  try {
    // Get batches with low stock
    const batchOptions = {
      status: "active",
      maxRemaining: threshold,
      includeInactive: false,
      limit: limit || 10,
      sortBy: "remainingQuantity",
      sortOrder: "ASC",
    };

    const batchResult = await batchService.findAll(batchOptions);
    const batches = batchResult.data;

    // Enrich with meat details
    const lowStockItems = await Promise.all(
      batches.map(async (batch) => {
        let meat = batch.meat;
        if (!meat && batch.meatId) {
          meat = await meatService.findById(batch.meatId);
        }
        return {
          id: batch.id,
          batchCode: batch.batchCode,
          name: meat?.name || "Unknown Meat",
          sku: meat?.sku || "N/A",
          stockQty: Number(batch.remainingQuantity).toFixed(3), // ✅ format to 3 decimals
          price: meat?.pricePerKg || batch.unitCost || 0,
          expiryDate: batch.expiryDate,
          daysUntilExpiry: batch.expiryDate
            ? Math.ceil((new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
            : null,
        };
      })
    );

    return {
      status: true,
      message: "Low stock items retrieved successfully",
      data: lowStockItems,
    };
  } catch (error) {
    console.error("Error in getLowStockAlert:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve low stock items",
      data: [],
    };
  }
};