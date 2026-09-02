// src/main/ipc/analytics/inventoryReports/get_data.ipc.js
//@ts-check
const { AppDataSource } = require("../../../db/data-source");
const Meat = require("../../../../entities/Meat");
const Batch = require("../../../../entities/Batch");
const InventoryMovement = require("../../../../entities/InventoryMovement");
const {
  paginateQueryBuilder,
} = require("../../../../utils/dbUtils/pagination");

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
    const meatRepo = AppDataSource.getRepository(Meat);
    const batchRepo = AppDataSource.getRepository(Batch);

    // ─── 1. Build meat query with pagination ────────────────────────
    const qb = meatRepo
      .createQueryBuilder("meat")
      .leftJoinAndSelect("meat.category", "category")
      .leftJoinAndSelect("meat.supplier", "supplier")
      .where("meat.isActive = :isActive", { isActive: true });

    if (categoryId)
      qb.andWhere("meat.categoryId = :categoryId", { categoryId });
    if (supplierId)
      qb.andWhere("meat.supplierId = :supplierId", { supplierId });

    const allowedSortColumns = [
      "id",
      "sku",
      "name",
      "pricePerKg",
      "createdAt",
      "updatedAt",
    ];
    const sortBySafe = allowedSortColumns.includes(sortBy) ? sortBy : "name";
    const sortOrderSafe = sortOrder === "ASC" ? "ASC" : "DESC";

    const meatResult = await paginateQueryBuilder(qb, {
      page,
      limit,
      sortBy: sortBySafe,
      sortOrder: sortOrderSafe,
    });
    const meats = meatResult.data || [];

    // ─── 2. For each meat, aggregate batch data using SQL ────────
    const enrichedMeats = await Promise.all(
      meats.map(async (meat) => {
        // ✅ Fixed: use array for select, aliases with AS
        const batchSummary = await batchRepo
          .createQueryBuilder("batch")
          .select([
            "COUNT(batch.id) AS batchCount",
            "COALESCE(SUM(batch.remainingQuantity), 0) AS totalStock",
            "COALESCE(SUM(CASE WHEN batch.status = 'active' THEN batch.remainingQuantity ELSE 0 END), 0) AS totalActiveStock",
            "COALESCE(SUM(batch.remainingQuantity * batch.unitCost), 0) AS totalValue",
            "COALESCE(AVG(CASE WHEN batch.remainingQuantity > 0 THEN batch.unitCost ELSE NULL END), 0) AS avgCost",
            "COUNT(CASE WHEN batch.status = 'active' THEN 1 END) AS activeBatchCount",
            "COUNT(CASE WHEN batch.status = 'active' AND batch.expiryDate > date('now') AND batch.expiryDate <= date('now', '+7 days') THEN 1 END) AS expiringCount",
            "COUNT(CASE WHEN batch.status != 'expired' AND batch.expiryDate < date('now') THEN 1 END) AS expiredCount",
          ])
          .where("batch.meatId = :meatId", { meatId: meat.id })
          .getRawOne();

        const totalStock = parseFloat(batchSummary.totalStock) || 0;
        const totalActiveStock = parseFloat(batchSummary.totalActiveStock) || 0;
        const totalValue = parseFloat(batchSummary.totalValue) || 0;
        const avgCost = parseFloat(batchSummary.avgCost) || 0;
        const batchCount = parseInt(batchSummary.batchCount, 10) || 0;
        const activeBatchCount =
          parseInt(batchSummary.activeBatchCount, 10) || 0;
        const expiringCount = parseInt(batchSummary.expiringCount, 10) || 0;
        const expiredCount = parseInt(batchSummary.expiredCount, 10) || 0;

        const isLowStock =
          totalActiveStock <= lowStockThreshold && totalActiveStock > 0;
        const isOutOfStock = totalActiveStock === 0;
        const hasBatches = batchCount > 0;

        // ─── 3. Batch details (limited to 50 per meat) ──────────
        const batchDetails = await batchRepo
          .createQueryBuilder("batch")
          .select([
            "batch.id",
            "batch.batchCode",
            "batch.remainingQuantity",
            "batch.unitCost",
            "batch.expiryDate",
            "batch.status",
          ])
          .where("batch.meatId = :meatId", { meatId: meat.id })
          .orderBy("batch.expiryDate", "ASC")
          .limit(50)
          .getRawMany();

        const formattedBatches = batchDetails.map((b) => ({
          id: b.batch_id,
          batchCode: b.batch_batchCode,
          remainingQuantity: parseFloat(b.batch_remainingQuantity) || 0,
          unitCost: parseFloat(b.batch_unitCost) || 0,
          expiryDate: b.batch_expiryDate,
          status: b.batch_status,
          daysUntilExpiry: Math.ceil(
            (new Date(b.batch_expiryDate) - new Date()) / (1000 * 60 * 60 * 24),
          ),
        }));

        return {
          ...meat,
          inventory: {
            totalStock,
            totalActiveStock,
            totalValue,
            avgCost,
            batchCount,
            activeBatchCount,
            expiringBatches: expiringCount,
            expiredBatches: expiredCount,
            isLowStock,
            isOutOfStock,
            hasBatches,
          },
          batches: formattedBatches,
        };
      }),
    );

    // ─── 4. Movement history (if requested) ────────────────────────
    let movementHistory = [];
    if (includeMovementHistory) {
      const movementRepo = AppDataSource.getRepository(InventoryMovement);
      const movementQb = movementRepo
        .createQueryBuilder("movement")
        .leftJoinAndSelect("movement.meat", "meat")
        .leftJoinAndSelect("movement.batch", "batch")
        .leftJoinAndSelect("movement.sale", "sale")
        .orderBy("movement.timestamp", "DESC");

      if (startDate)
        movementQb.andWhere("movement.timestamp >= :start", {
          start: new Date(startDate),
        });
      if (endDate)
        movementQb.andWhere("movement.timestamp <= :end", {
          end: new Date(endDate),
        });

      const movementResult = await movementQb.limit(1000).getMany();
      movementHistory = movementResult;
    }

    // ─── 5. Summary (aggregated across all data) ──────────────────
    const summary = await getInventorySummaryData(
      lowStockThreshold,
      categoryId,
      supplierId,
    );

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

// ─── Helper: Inventory Summary (aggregated) ──────────────────────

async function getInventorySummaryData(
  lowStockThreshold,
  categoryId,
  supplierId,
) {
  const meatRepo = AppDataSource.getRepository(Meat);
  const batchRepo = AppDataSource.getRepository(Batch);

  // 1. Get all active meats (with optional filters)
  const meatQb = meatRepo
    .createQueryBuilder("meat")
    .leftJoinAndSelect("meat.category", "category")
    .leftJoinAndSelect("meat.supplier", "supplier")
    .where("meat.isActive = :isActive", { isActive: true });

  if (categoryId)
    meatQb.andWhere("meat.categoryId = :categoryId", { categoryId });
  if (supplierId)
    meatQb.andWhere("meat.supplierId = :supplierId", { supplierId });

  const meats = await meatQb.getMany();
  const meatIds = meats.map((m) => m.id);

  // 2. Get all batches for these meats (filtered)
  const batchQb = batchRepo
    .createQueryBuilder("batch")
    .where("batch.meatId IN (:...meatIds)", { meatIds });

  const batches = await batchQb.getMany();

  // 3. Compute totals using JS (since we already have the data)
  const now = new Date();
  let totalValue = 0;
  let totalStock = 0;
  let totalActiveStock = 0;
  let expiringCount = 0;
  let expiredCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let hasBatchesCount = 0;

  const meatInventory = meats.map((meat) => {
    const meatBatches = batches.filter((b) => b.meatId === meat.id);
    const activeBatches = meatBatches.filter((b) => b.status === "active");
    const totalMeatStock = meatBatches.reduce(
      (sum, b) => sum + b.remainingQuantity,
      0,
    );
    const totalMeatActiveStock = activeBatches.reduce(
      (sum, b) => sum + b.remainingQuantity,
      0,
    );
    const meatValue = meatBatches.reduce(
      (sum, b) => sum + b.remainingQuantity * b.unitCost,
      0,
    );

    let meatExpiring = 0;
    let meatExpired = 0;
    meatBatches.forEach((b) => {
      if (b.status !== "active") return;
      const expiryDate = new Date(b.expiryDate);
      const daysUntilExpiry = Math.ceil(
        (expiryDate - now) / (1000 * 60 * 60 * 24),
      );
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
      isLowStock:
        totalMeatActiveStock <= lowStockThreshold && totalMeatActiveStock > 0,
      isOutOfStock: totalMeatActiveStock === 0,
      hasBatches: meatBatches.length > 0,
      categoryName: meat.category?.name || "Uncategorized",
      supplierName: meat.supplier?.name || "Unknown",
    };
  });

  meatInventory.forEach((m) => {
    totalValue += m.totalValue;
    totalStock += m.totalStock;
    totalActiveStock += m.totalActiveStock;
    expiringCount += m.expiring;
    expiredCount += m.expired;
    if (m.isLowStock) lowStockCount++;
    if (m.isOutOfStock) outOfStockCount++;
  });

  // Top 5 by value
  const topByValue = [...meatInventory]
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5)
    .map((m) => ({
      id: m.meatId,
      name: m.meatName,
      inventoryValue: m.totalValue,
    }));

  // Top 5 by stock
  const topByStock = [...meatInventory]
    .sort((a, b) => b.totalStock - a.totalStock)
    .slice(0, 5)
    .map((m) => ({ id: m.meatId, name: m.meatName, totalStock: m.totalStock }));

  // Category breakdown
  const categoryBreakdown = {};
  meatInventory.forEach((m) => {
    const cat = m.categoryName;
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = {
        categoryId: "uncategorized",
        categoryName: cat,
        count: 0,
        totalValue: 0,
        totalStock: 0,
      };
    }
    categoryBreakdown[cat].count += 1;
    categoryBreakdown[cat].totalValue += m.totalValue;
    categoryBreakdown[cat].totalStock += m.totalStock;
  });

  // Supplier breakdown
  const supplierBreakdown = {};
  meatInventory.forEach((m) => {
    const supp = m.supplierName;
    if (!supplierBreakdown[supp]) {
      supplierBreakdown[supp] = {
        supplierId: "unknown",
        supplierName: supp,
        count: 0,
        totalValue: 0,
        totalStock: 0,
      };
    }
    supplierBreakdown[supp].count += 1;
    supplierBreakdown[supp].totalValue += m.totalValue;
    supplierBreakdown[supp].totalStock += m.totalStock;
  });

  return {
    totalMeats: meats.length,
    totalBatches: batches.length,
    totalValue,
    totalStock,
    totalActiveStock,
    expiringCount,
    expiredCount,
    lowStockCount,
    outOfStockCount,
    hasBatchesCount,
    topMeatsByValue: topByValue,
    topMeatsByStock: topByStock,
    categoryBreakdown: Object.values(categoryBreakdown),
    supplierBreakdown: Object.values(supplierBreakdown),
    averageStockValue: meats.length > 0 ? totalValue / meats.length : 0,
  };
}
