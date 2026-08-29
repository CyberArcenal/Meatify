// src/main/ipc/core/auditLog/get/all.ipc.js
//@ts-check
const auditLogService = require("../../../../../services/AuditLog");

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
        items: result.data,                 // ✅ array ng meats
        total: result.pagination.total,     // ✅ total items
        page: result.pagination.page,       // ✅ current page
        limit: result.pagination.limit,     // ✅ items per page
        totalPages: result.pagination.pages, // ✅ total pages (convert "pages" to "totalPages")
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