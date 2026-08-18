// src/main/ipc/core/auditLog/get/all.ipc.js
const auditLogService = require("../../../../../services/AuditLogService");

module.exports = async (params) => {
  const { page, limit, sortBy, sortOrder, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      ...filters,
    };
    
    const result = await auditLogService.findAll(options);
    return {
      status: true,
      message: "AuditLogs retrieved successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in getAllAuditLogs:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve audit logs",
      data: null,
    };
  }
};