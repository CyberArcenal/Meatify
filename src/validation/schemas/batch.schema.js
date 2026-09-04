// src/validation/schemas/batch.schema.js
const { z } = require('zod');

// Reusable base schemas
const positiveNumber = z.number().positive('must be greater than 0');
const nonNegativeNumber = z.number().min(0, 'must be 0 or greater');

const batchCreateSchema = z.object({
  meatId: z.number().int().positive('meatId must be a positive integer'),
  quantity: positiveNumber,
  unitCost: nonNegativeNumber,
  expiryDate: z.string().date().refine(
    (date) => new Date(date) > new Date(),
    { message: 'Expiry date must be in the future' }
  ),
  supplierId: z.number().int().positive().optional(),
  status: z.enum(['active', 'on_hold']).optional(),
  note: z.string().max(500, 'Note cannot exceed 500 characters').optional(),
  batchCode: z.string().max(50).optional(),
});

const batchUpdateSchema = z.object({
  batchCode: z.string().max(50).optional(),
  unitCost: nonNegativeNumber.optional(),
  expiryDate: z.string().date().refine(
    (date) => new Date(date) > new Date(),
    { message: 'Expiry date must be in the future' }
  ).optional(),
  note: z.string().max(500).optional(),
});

const batchStatusSchema = z.object({
  status: z.enum(['active', 'depleted', 'expired', 'on_hold']),
});

const batchRemainingQuantitySchema = z.object({
  newQuantity: z.number().min(0, 'Remaining quantity cannot be negative'),
});

module.exports = {
  batchCreateSchema,
  batchUpdateSchema,
  batchStatusSchema,
  batchRemainingQuantitySchema,
};