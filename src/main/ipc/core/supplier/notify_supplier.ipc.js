// src/main/ipc/core/supplier/notify_supplier.ipc.js
const { SupplierStateService } = require("../../../../stateServices/SupplierStateService");
const { AppDataSource } = require("../../db/data-source");

module.exports = async (params, queryRunner) => {
  const { supplierId, subject, message, user = "system" } = params;

  if (!supplierId || typeof supplierId !== "number") {
    return { status: false, message: "Valid supplier ID is required", data: null };
  }
  if (!subject) {
    return { status: false, message: "Subject is required", data: null };
  }
  if (!message) {
    return { status: false, message: "Message is required", data: null };
  }

  try {
    const stateService = new SupplierStateService(AppDataSource);
    const result = await stateService.notifySupplier(
      supplierId,
      subject,
      message,
      user,
      queryRunner
    );
    return {
      status: true,
      message: `Notification sent to supplier #${supplierId}`,
      data: result,
    };
  } catch (error) {
    console.error("Error in notifySupplier:", error);
    return {
      status: false,
      message: error.message || "Failed to notify supplier",
      data: null,
    };
  }
};