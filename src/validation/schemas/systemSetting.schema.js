// src/validation/schemas/systemSetting.schema.js
const { z } = require('zod');

// This schema validates the structure, not the actual setting values
const systemSettingCreateSchema = z.object({
  key: z.string().min(1, 'Key is required').max(100),
  value: z.string().min(1, 'Value is required').max(5000),
  setting_type: z.enum(['general', 'inventory', 'sales', 'notifications', 'cashier']),
  description: z.string().max(500).optional(),
  is_public: z.boolean().optional(),
});

const systemSettingUpdateSchema = z.object({
  key: z.string().min(1).max(100).optional(),
  value: z.string().min(1).max(5000).optional(),
  setting_type: z.enum(['general', 'inventory', 'sales', 'notifications', 'cashier']).optional(),
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