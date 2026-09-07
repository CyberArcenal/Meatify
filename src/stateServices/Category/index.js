// src/stateServices/category/index.js
const { CategoryStateService } = require("./CategoryStateService");
const CategoryStatusModule = require("./modules/CategoryStatusModule");
const CategoryNotificationModule = require("./modules/CategoryNotificationModule");
const CategoryAuditModule = require("./modules/CategoryAuditModule");

module.exports = {
  CategoryStateService,
  CategoryStatusModule,
  CategoryNotificationModule,
  CategoryAuditModule,
};