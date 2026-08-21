// src/main/ipc/dashboard/get_activities.ipc.js
//@ts-check
const { formatDistanceToNow } = require("date-fns");
const auditLogService = require("../../../../services/AuditLog");

module.exports = async (params) => {
  const { limit = 10 } = params;

  try {
    // Get recent audit logs
    const auditOptions = {
      limit: limit || 10,
      sortBy: "timestamp",
      sortOrder: "DESC",
    };

    const auditResult = await auditLogService.findAll(auditOptions);
    const logs = auditResult.data;

    // Map to activity entries
    const activities = logs.map((log) => {
      let type = "audit";
      let description = log.description || `${log.action} on ${log.entity}`;

      // Determine activity type based on entity/action
      if (log.entity === "Sale" || log.entity === "SaleItem") {
        type = "sale";
        description = log.description || `Sale ${log.action}`;
      } else if (log.entity === "Batch" || log.entity === "InventoryMovement" || log.entity === "Meat") {
        type = "inventory";
        description = log.description || `Inventory ${log.action}`;
      }

      return {
        id: log.id,
        type,
        description,
        formattedTime: formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }),
        timestamp: log.timestamp,
        entity: log.entity,
        action: log.action,
        user: log.user,
      };
    });

    return {
      status: true,
      message: "Recent activities retrieved successfully",
      data: activities,
    };
  } catch (error) {
    console.error("Error in getRecentActivities:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve recent activities",
      data: [],
    };
  }
};