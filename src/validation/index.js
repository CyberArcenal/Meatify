// src/validation/index.js
//@ts-check
const { validate } = require('./validate');

const batchSchemas = require('./schemas/batch.schema');
const saleSchemas = require('./schemas/sale.schema');
const customerSchemas = require('./schemas/customer.schema');
const purchaseSchemas = require('./schemas/purchase.schema');
const returnRefundSchemas = require('./schemas/returnRefund.schema');
const meatSchemas = require('./schemas/meat.schema');
const categorySchemas = require('./schemas/category.schema');
const supplierSchemas = require('./schemas/supplier.schema');
const inventoryMovementSchemas = require('./schemas/inventoryMovement.schema');
const loyaltyTransactionSchemas = require('./schemas/loyaltyTransaction.schema');
const notificationSchemas = require('./schemas/notification.schema');
const systemSettingSchemas = require('./schemas/systemSetting.schema');

module.exports = {
  validate,
  ...batchSchemas,
  ...saleSchemas,
  ...customerSchemas,
  ...purchaseSchemas,
  ...returnRefundSchemas, 
  ...meatSchemas,
  ...categorySchemas,
  ...supplierSchemas,
  ...inventoryMovementSchemas,
  ...loyaltyTransactionSchemas,
  ...notificationSchemas,
  ...systemSettingSchemas,
};