// src/stateServices/inventoryMovement/index.js
const { InventoryMovementStateService } = require("./InventoryMovementStateService");
const MovementCreatedModule = require("./modules/status/MovementCreatedModule");
const MovementUpdatedModule = require("./modules/status/MovementUpdatedModule");
const MovementDeletedModule = require("./modules/status/MovementDeletedModule");
const InventoryMovementStatusModule = require("./modules/InventoryMovementStatusModule");
const InventoryMovementBatchModule = require("./modules/InventoryMovementBatchModule");
const InventoryMovementAuditModule = require("./modules/InventoryMovementAuditModule");

module.exports = {
  InventoryMovementStateService,
  MovementCreatedModule,
  MovementUpdatedModule,
  MovementDeletedModule,
  InventoryMovementStatusModule,
  InventoryMovementBatchModule,
  InventoryMovementAuditModule,
};