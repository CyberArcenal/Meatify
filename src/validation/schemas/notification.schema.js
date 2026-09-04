// src/validation/schemas/notification.schema.js
const { z } = require('zod');

const notificationCreateSchema = z.object({
  userId: z.number().int().positive(),
  title: z.string().min(1, 'Title is required').max(255),
  message: z.string().min(1, 'Message is required').max(1000),
  type: z.enum(['info', 'success', 'warning', 'error', 'purchase', 'sale']).optional(),
  metadata: z.any().optional(),
});

const notificationUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  message: z.string().min(1).max(1000).optional(),
  type: z.enum(['info', 'success', 'warning', 'error', 'purchase', 'sale']).optional(),
  metadata: z.any().optional(),
  // isRead is handled separately via markAsRead/unread
});

const notificationMarkReadSchema = z.object({
  isRead: z.boolean(),
});

module.exports = {
  notificationCreateSchema,
  notificationUpdateSchema,
  notificationMarkReadSchema,
};