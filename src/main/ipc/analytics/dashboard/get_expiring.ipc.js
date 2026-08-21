// src/main/ipc/dashboard/get_expiring.ipc.js
//@ts-check
const batchService = require("../../../../services/Batch");
const meatService = require("../../../../services/Meat");

module.exports = async (params) => {
  const { days = 7, limit = 10 } = params;

  try {
    const endDate = new Date();
    const expiryEnd = new Date();
    expiryEnd.setDate(expiryEnd.getDate() + days);

    const batchOptions = {
      status: "active",
      expiryDateTo: expiryEnd.toISOString(),
      expiryDateFrom: new Date().toISOString(),
      includeInactive: false,
      limit: limit || 10,
      sortBy: "expiryDate",
      sortOrder: "ASC",
    };

    const batchResult = await batchService.findAll(batchOptions);
    const batches = batchResult.data;

    const expiringBatches = await Promise.all(
      batches.map(async (batch) => {
        let meat = batch.meat;
        if (!meat && batch.meatId) {
          meat = await meatService.findById(batch.meatId, true);
        }
        const daysUntilExpiry = Math.ceil(
          (new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
        );
        return {
          id: batch.id,
          batchCode: batch.batchCode,
          meatName: meat?.name || "Unknown",
          remainingQuantity: batch.remainingQuantity,
          expiryDate: batch.expiryDate,
          daysUntilExpiry,
          isUrgent: daysUntilExpiry <= 3,
        };
      })
    );

    return {
      status: true,
      message: "Expiring batches retrieved successfully",
      data: expiringBatches,
    };
  } catch (error) {
    console.error("Error in getExpiringBatches:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve expiring batches",
      data: [],
    };
  }
};