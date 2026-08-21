// src/main/ipc/analytics/inventoryReports/get_summary.ipc.js
const meatService = require("../../../services/MeatService");
const batchService = require("../../../services/BatchService");
const inventoryMovementService = require("../../../services/InventoryMovementService");

module.exports = async (params) => {
  const { 
    lowStockThreshold = 5,
    categoryId,
    supplierId,
  } = params || {};

  try {
    // Get all active meats
    const meatOptions = {
      isActive: true,
      limit: 10000,
      categoryId,
      supplierId,
    };
    const meatResult = await meatService.findAll(meatOptions);
    const meats = meatResult.data;

    // Get all batches
    const batchOptions = {
      includeInactive: true,
      limit: 10000,
    };
    const batchResult = await batchService.findAll(batchOptions);
    const batches = batchResult.data;

    const now = new Date();

    // Calculate key metrics
    let totalMeats = meats.length;
    let totalBatches = batches.length;
    let totalValue = 0;
    let totalStock = 0;
    let totalActiveStock = 0;
    let expiringCount = 0;
    let expiredCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let hasBatchesCount = 0;

    const meatInventory = meats.map(meat => {
      const meatBatches = batches.filter(b => b.meatId === meat.id);
      const activeBatches = meatBatches.filter(b => b.status === "active");
      const totalMeatStock = meatBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);
      const totalMeatActiveStock = activeBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);
      const meatValue = meatBatches.reduce((sum, b) => sum + (b.remainingQuantity * b.unitCost), 0);

      // Count expiring and expired for this meat
      let meatExpiring = 0;
      let meatExpired = 0;
      meatBatches.forEach(b => {
        if (b.status !== "active") return;
        const expiryDate = new Date(b.expiryDate);
        const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0) meatExpiring++;
        if (expiryDate < now) meatExpired++;
      });

      if (meatBatches.length > 0) hasBatchesCount++;

      return {
        meatId: meat.id,
        meatName: meat.name,
        sku: meat.sku,
        totalStock: totalMeatStock,
        totalActiveStock: totalMeatActiveStock,
        totalValue: meatValue,
        batchCount: meatBatches.length,
        activeBatchCount: activeBatches.length,
        expiring: meatExpiring,
        expired: meatExpired,
        isLowStock: totalMeatActiveStock <= lowStockThreshold && totalMeatActiveStock > 0,
        isOutOfStock: totalMeatActiveStock === 0,
        hasBatches: meatBatches.length > 0,
        categoryName: meat.category?.name || "Uncategorized",
        supplierName: meat.supplier?.name || "Unknown",
      };
    });

    // Aggregate metrics
    meatInventory.forEach(m => {
      totalValue += m.totalValue;
      totalStock += m.totalStock;
      totalActiveStock += m.totalActiveStock;
      expiringCount += m.expiring;
      expiredCount += m.expired;
      if (m.isLowStock) lowStockCount++;
      if (m.isOutOfStock) outOfStockCount++;
    });

    // Get low stock items
    const lowStockItems = meatInventory
      .filter(m => m.isLowStock)
      .sort((a, b) => a.totalActiveStock - b.totalActiveStock);

    // Get out of stock items
    const outOfStockItems = meatInventory
      .filter(m => m.isOutOfStock)
      .sort((a, b) => a.meatName.localeCompare(b.meatName));

    // Get expiring soon items
    const expiringItems = meatInventory
      .filter(m => m.expiring > 0)
      .sort((a, b) => b.expiring - a.expiring);

    // Get top value items
    const topValueItems = meatInventory
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    // Get category summary
    const categorySummary = {};
    meatInventory.forEach(m => {
      if (!categorySummary[m.categoryName]) {
        categorySummary[m.categoryName] = {
          category: m.categoryName,
          count: 0,
          totalValue: 0,
          totalStock: 0,
        };
      }
      categorySummary[m.categoryName].count += 1;
      categorySummary[m.categoryName].totalValue += m.totalValue;
      categorySummary[m.categoryName].totalStock += m.totalStock;
    });

    // Get supplier summary
    const supplierSummary = {};
    meatInventory.forEach(m => {
      if (!supplierSummary[m.supplierName]) {
        supplierSummary[m.supplierName] = {
          supplier: m.supplierName,
          count: 0,
          totalValue: 0,
          totalStock: 0,
        };
      }
      supplierSummary[m.supplierName].count += 1;
      supplierSummary[m.supplierName].totalValue += m.totalValue;
      supplierSummary[m.supplierName].totalStock += m.totalStock;
    });

    return {
      status: true,
      message: "Inventory summary retrieved successfully",
      data: {
        summary: {
          totalMeats,
          totalBatches,
          totalValue,
          totalStock,
          totalActiveStock,
          expiringCount,
          expiredCount,
          lowStockCount,
          outOfStockCount,
          hasBatchesCount,
          averageValue: totalMeats > 0 ? totalValue / totalMeats : 0,
          averageStock: totalMeats > 0 ? totalStock / totalMeats : 0,
          averageActiveStock: totalMeats > 0 ? totalActiveStock / totalMeats : 0,
        },
        lowStockItems,
        outOfStockItems,
        expiringItems,
        topValueItems,
        categorySummary: Object.values(categorySummary),
        supplierSummary: Object.values(supplierSummary),
        threshold: lowStockThreshold,
      },
    };
  } catch (error) {
    console.error("Error in getInventorySummary:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve inventory summary",
      data: null,
    };
  }
};