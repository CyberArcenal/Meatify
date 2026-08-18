// src/main/ipc/core/auditLog/search.ipc.js
const auditLogService = require("../../../../services/AuditLogService");

module.exports = async (params) => {
  const { search, page, limit, sortBy, sortOrder, ...filters } = params;

  try {
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      ...filters,
    };
    
    const result = await auditLogService.findAll(options);
    return {
      status: true,
      message: "Search completed successfully",
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };
  } catch (error) {
    console.error("Error in searchAuditLogs:", error);
    return {
      status: false,
      message: error.message || "Search failed",
      data: null,
    };
  }
};