// src/main/ipc/core/notificationLog/import_csv.ipc.js
//@ts-check
const notificationLogService = require("../../../../services/NotificationLog");
const fs = require("fs").promises;

module.exports = async (params, queryRunner) => {
  const { filePath, user = "system" } = params;

  if (!filePath) {
    return { status: false, message: "filePath is required", data: null };
  }

  try {
    await fs.access(filePath);
    const result = await notificationLogService.importFromCSV(filePath, user, queryRunner);
    return {
      status: true,
      message: `CSV import completed. ${result.imported.length} imported, ${result.errors.length} failed.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in importLogsCSV:", error);
    return {
      status: false,
      message: error.message || "Failed to import notification logs",
      data: null,
    };
  }
};