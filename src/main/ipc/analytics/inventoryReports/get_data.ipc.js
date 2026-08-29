// src/main/ipc/analytics/inventoryReports/get_data.ipc.js
//@ts-check
const meatService = require("../../../../services/Meat");
const batchService = require("../../../../services/Batch");
const inventoryMovementService = require("../../../../services/InventoryMovement");

module.exports = async (params) => {
  const { 
    startDate,
    endDate,
    includeMovementHistory = true,
    includeExpiryTracking = true,
    lowStockThreshold = 5,
    categoryId,
    supplierId,
    page = 1,
    limit = 20,
    sortBy = "name",
    sortOrder = "ASC",
  } = params;

  try {
    // Get all meat products with pagination
    const meatOptions = {
      page,
      limit,
      sortBy,
      sortOrder,
      isActive: true,
      categoryId,
      supplierId,
    };
    const meatResult = await meatService.findAll(meatOptions);
    const meats = meatResult.data || [];

    // Get batches for each meat
    const enrichedMeats = await Promise.all(
      meats.map(async (meat) => {
        const batchOptions = {
          meatId: meat.id,
          includeInactive: true,
          limit: 1000,
        };
        const batchResult = await batchService.findAll(batchOptions);
        const batches = batchResult.data || [];

        const totalStock = batches.reduce((sum, b) => sum + b.remainingQuantity, 0);
        const activeBatches = batches.filter(b => b.status === "active");
        const totalActiveStock = activeBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);
        const totalValue = batches.reduce((sum, b) => sum + (b.remainingQuantity * b.unitCost), 0);
        const avgCost = totalStock > 0 ? totalValue / totalStock : 0;

        const expiringBatches = batches.filter(b => {
          const expiryDate = new Date(b.expiryDate);
          const now = new Date();
          const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
          return daysUntilExpiry <= 7 && daysUntilExpiry >= 0 && b.status === "active";
        });

        const expiredBatches = batches.filter(b => {
          const expiryDate = new Date(b.expiryDate);
          const now = new Date();
          return expiryDate < now && b.status !== "expired";
        });

        const isLowStock = totalActiveStock <= lowStockThreshold && totalActiveStock > 0;
        const isOutOfStock = totalActiveStock === 0;

        const batchDetails = batches.map(b => ({
          id: b.id,
          batchCode: b.batchCode,
          remainingQuantity: b.remainingQuantity,
          unitCost: b.unitCost,
          expiryDate: b.expiryDate,
          status: b.status,
          daysUntilExpiry: Math.ceil((new Date(b.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)),
        }));

        return {
          ...meat,
          inventory: {
            totalStock,
            totalActiveStock,
            totalValue,
            avgCost,
            batchCount: batches.length,
            activeBatchCount: activeBatches.length,
            expiringBatches: expiringBatches.length,
            expiredBatches: expiredBatches.length,
            isLowStock,
            isOutOfStock,
            hasBatches: batches.length > 0,
          },
          batches: batchDetails,
        };
      })
    );

    let movementHistory = [];
    if (includeMovementHistory) {
      const movementOptions = {
        startDate,
        endDate,
        limit: 1000,
        sortBy: "timestamp",
        sortOrder: "DESC",
      };
      const movementResult = await inventoryMovementService.findAll(movementOptions);
      movementHistory = movementResult.data || [];
    }

    const summary = await getInventorySummaryData(startDate, endDate, lowStockThreshold);

    return {
      status: true,
      message: "Inventory data retrieved successfully",
      data: {
        meats: enrichedMeats,
        pagination: meatResult.pagination,
        movementHistory: includeMovementHistory ? movementHistory : [],
        summary,
        filters: {
          startDate,
          endDate,
          lowStockThreshold,
          categoryId,
          supplierId,
        },
      },
    };
  } catch (error) {
    console.error("Error in getInventoryData:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve inventory data",
      data: null,
    };
  }
};

async function getInventorySummaryData(startDate, endDate, lowStockThreshold) {
  try {
    const meatOptions = {
      isActive: true,
      limit: 10000,
    };
    const meatResult = await meatService.findAll(meatOptions);
    const meats = meatResult.data || [];

    const batchOptions = {
      includeInactive: true,
      limit: 10000,
    };
    const batchResult = await batchService.findAll(batchOptions);
    const batches = batchResult.data || [];

    // ✅ FIX: define totalMeats
    const totalMeats = meats.length;

    let totalValue = 0;
    let totalStock = 0;
    let totalActiveStock = 0;
    let expiringCount = 0;
    let expiredCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const now = new Date();

    meats.forEach(meat => {
      const meatBatches = batches.filter(b => b.meatId === meat.id);
      const activeBatches = meatBatches.filter(b => b.status === "active");
      const totalMeatStock = meatBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);
      const totalMeatActiveStock = activeBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);
      const meatValue = meatBatches.reduce((sum, b) => sum + (b.remainingQuantity * b.unitCost), 0);

      totalValue += meatValue;
      totalStock += totalMeatStock;
      totalActiveStock += totalMeatActiveStock;

      meatBatches.forEach(b => {
        if (b.status !== "active") return;
        const expiryDate = new Date(b.expiryDate);
        const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0) expiringCount++;
        if (expiryDate < now) expiredCount++;
      });

      if (totalMeatActiveStock === 0) outOfStockCount++;
      else if (totalMeatActiveStock <= lowStockThreshold) lowStockCount++;
    });

    const topMeatsByValue = meats
      .map(meat => {
        const meatBatches = batches.filter(b => b.meatId === meat.id);
        const value = meatBatches.reduce((sum, b) => sum + (b.remainingQuantity * b.unitCost), 0);
        return { ...meat, inventoryValue: value };
      })
      .sort((a, b) => b.inventoryValue - a.inventoryValue)
      .slice(0, 5);

    const topMeatsByStock = meats
      .map(meat => {
        const meatBatches = batches.filter(b => b.meatId === meat.id);
        const stock = meatBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);
        return { ...meat, totalStock: stock };
      })
      .sort((a, b) => b.totalStock - a.totalStock)
      .slice(0, 5);

    const categoryBreakdown = {};
    meats.forEach(meat => {
      const catId = meat.categoryId || "uncategorized";
      if (!categoryBreakdown[catId]) {
        categoryBreakdown[catId] = {
          categoryId: catId,
          categoryName: meat.category?.name || "Uncategorized",
          count: 0,
          totalValue: 0,
          totalStock: 0,
        };
      }
      const meatBatches = batches.filter(b => b.meatId === meat.id);
      categoryBreakdown[catId].count += 1;
      categoryBreakdown[catId].totalValue += meatBatches.reduce((sum, b) => sum + (b.remainingQuantity * b.unitCost), 0);
      categoryBreakdown[catId].totalStock += meatBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);
    });

    const supplierBreakdown = {};
    meats.forEach(meat => {
      const supplierId = meat.supplierId || "unknown";
      if (!supplierBreakdown[supplierId]) {
        supplierBreakdown[supplierId] = {
          supplierId: supplierId,
          supplierName: meat.supplier?.name || "Unknown",
          count: 0,
          totalValue: 0,
          totalStock: 0,
        };
      }
      const meatBatches = batches.filter(b => b.meatId === meat.id);
      supplierBreakdown[supplierId].count += 1;
      supplierBreakdown[supplierId].totalValue += meatBatches.reduce((sum, b) => sum + (b.remainingQuantity * b.unitCost), 0);
      supplierBreakdown[supplierId].totalStock += meatBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);
    });

    return {
      totalMeats,
      totalBatches: batches.length,
      totalValue,
      totalStock,
      totalActiveStock,
      expiringCount,
      expiredCount,
      lowStockCount,
      outOfStockCount,
      topMeatsByValue,
      topMeatsByStock,
      categoryBreakdown: Object.values(categoryBreakdown),
      supplierBreakdown: Object.values(supplierBreakdown),
      averageStockValue: totalMeats > 0 ? totalValue / totalMeats : 0,
    };
  } catch (error) {
    console.error("Error generating inventory summary:", error);
    return {
      totalMeats: 0,
      totalBatches: 0,
      totalValue: 0,
      totalStock: 0,
      totalActiveStock: 0,
      expiringCount: 0,
      expiredCount: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      topMeatsByValue: [],
      topMeatsByStock: [],
      categoryBreakdown: [],
      supplierBreakdown: [],
      averageStockValue: 0,
    };
  }
}