// src/validation/schemas/meat.schema.js
const { z } = require('zod');

const meatCreateSchema = z.object({
  sku: z.string().max(50).optional(),
  name: z.string().min(1, 'Name is required').max(100),
  barcode: z.string().max(50).regex(/^[\d\-]+$/, 'Barcode must contain only digits and dashes').optional(),
  description: z.string().max(500).optional(),
  pricePerKg: z.number().min(0, 'Price cannot be negative'),
  isActive: z.boolean().optional(),
  categoryId: z.number().int().positive().optional(),
  supplierId: z.number().int().positive().optional(),
  image: z.string().max(255).optional(),
});

const meatUpdateSchema = z.object({
  sku: z.string().max(50).optional(),
  name: z.string().min(1).max(100).optional(),
  barcode: z.string().max(50).regex(/^[\d\-]+$/).optional(),
  description: z.string().max(500).optional(),
  pricePerKg: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  supplierId: z.number().int().positive().nullable().optional(),
  image: z.string().max(255).nullable().optional(),
});

const meatPriceSchema = z.object({
  newPrice: z.number().min(0, 'Price cannot be negative'),
});

module.exports = {
  meatCreateSchema,
  meatUpdateSchema,
  meatPriceSchema,
};