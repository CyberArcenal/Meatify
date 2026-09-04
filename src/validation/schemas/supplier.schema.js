// src/validation/schemas/supplier.schema.js
const { z } = require('zod');

const emailSchema = z.string().email('Invalid email address').optional();
const phoneSchema = z.string().regex(/^[\d\+\-\(\)\s]+$/, 'Invalid phone format').optional();

const supplierCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  contactInfo: z.string().max(255).optional(),
  email: emailSchema,
  phone: phoneSchema,
  address: z.string().max(255).optional(),
  notes: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

const supplierUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  contactInfo: z.string().max(255).optional(),
  email: emailSchema,
  phone: phoneSchema,
  address: z.string().max(255).optional(),
  notes: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

const supplierMergeSchema = z.object({
  sourceSupplierId: z.number().int().positive(),
  targetSupplierId: z.number().int().positive(),
});

module.exports = {
  supplierCreateSchema,
  supplierUpdateSchema,
  supplierMergeSchema,
};