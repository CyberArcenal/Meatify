// src/renderer/pages/AuditTrail/utils/auditColors.ts

export const getActionColor = (action: string): string => {
  const lower = action.toLowerCase();
  
  // Sales & Transactions
  if (lower.includes("sale") || lower.includes("create") || lower.includes("add"))
    return "var(--accent-green)";
  
  // Refunds & Deletions
  if (lower.includes("refund") || lower.includes("delete") || lower.includes("remove") || lower.includes("void"))
    return "var(--accent-red)";
  
  // Inventory & Stock
  if (lower.includes("inventory") || lower.includes("stock") || lower.includes("batch") || lower.includes("movement"))
    return "var(--accent-blue)";
  
  // Settings & Configuration
  if (lower.includes("setting") || lower.includes("config") || lower.includes("update") || lower.includes("edit"))
    return "var(--accent-amber)";
  
  // Views & Exports
  if (lower.includes("view") || lower.includes("export") || lower.includes("print"))
    return "var(--accent-purple)";
  
  // Login / Auth
  if (lower.includes("login") || lower.includes("logout") || lower.includes("auth"))
    return "var(--accent-teal)";
  
  // Default
  return "var(--text-tertiary)";
};