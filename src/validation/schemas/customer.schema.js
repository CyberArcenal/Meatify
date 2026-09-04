// src/validation/schemas/customer.schema.js
const { z } = require('zod');

const emailSchema = z.string().email('Invalid email address').optional();
const phoneSchema = z.string().regex(/^[\d\+\-\(\)\s]+$/, 'Invalid phone format').optional();

const customerCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: emailSchema,
  phone: phoneSchema,
  address: z.string().max(255).optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(['regular', 'vip', 'elite']).optional(),
  isActive: z.boolean().optional(),
});

const customerUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: emailSchema,
  phone: phoneSchema,
  address: z.string().max(255).optional(),
  notes: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

// For status/points changes (used by state service)
const customerStatusSchema = z.object({
  status: z.enum(['regular', 'vip', 'elite']),
});

module.exports = {
  customerCreateSchema,
  customerUpdateSchema,
  customerStatusSchema,
};