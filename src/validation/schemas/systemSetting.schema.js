// src/validation/schemas/systemSetting.schema.js
const { z } = require('zod');

// ✅ FIXED: value should be z.any() because settings can be any type
const systemSettingCreateSchema = z.object({
  key: z.string().min(1, 'Key is required').max(100),
  value: z.any(), // ✅ Changed from z.string()
  setting_type: z.enum(['general', 'inventory', 'sales', 'notifications', 'cashier', 'audit_security']),
  description: z.string().max(500).optional(),
  is_public: z.boolean().optional(),
});

const systemSettingUpdateSchema = z.object({
  key: z.string().min(1).max(100).optional(),
  value: z.any(), // ✅ Changed from z.string()
  setting_type: z.enum(['general', 'inventory', 'sales', 'notifications', 'cashier', 'audit_security']).optional(),
  description: z.string().max(500).optional(),
  is_public: z.boolean().optional(),
  is_deleted: z.boolean().optional(),
});

// For bulk grouped config
const systemSettingGroupedSchema = z.record(
  z.string(),
  z.record(z.string(), z.any())
);

module.exports = {
  systemSettingCreateSchema,
  systemSettingUpdateSchema,
  systemSettingGroupedSchema,
};