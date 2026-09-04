// src/validation/schemas/inventoryMovement.schema.js
const { z } = require('zod');

const inventoryMovementCreateSchema = z.object({
  meatId: z.number().int().positive(),
  batchId: z.number().int().positive().optional(),
  movementType: z.enum(['sale', 'refund', 'adjustment', 'purchase', 'expiry_write_off', 'waste']),
  qtyChange: z.number().refine(val => val !== 0, 'Quantity change cannot be zero'),
  notes: z.string().max(500).optional(),
  saleId: z.number().int().positive().optional(),
});

const inventoryMovementUpdateSchema = z.object({
  movementType: z.enum(['sale', 'refund', 'adjustment', 'purchase', 'expiry_write_off', 'waste']).optional(),
  notes: z.string().max(500).optional(),
});

module.exports = {
  inventoryMovementCreateSchema,
  inventoryMovementUpdateSchema,
};