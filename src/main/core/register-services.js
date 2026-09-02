//@ts-check

const { APP_CONFIG } = require('./app-config');
const { ENVIRONMENT } = require('./environment');
const { logger } = require('./logger');
const { defaultContainer } = require('./service-container');


// ===================== REGISTER SERVICES =====================

// Register core services in the container
/**
 * @param {any} mainWindow
 * @param {any} splashWindow
 */
async function registerServices(mainWindow, splashWindow) {
  logger.debug('Registering services...');

  // Printer Service
  const PrinterService = require('../../services/Printer');
  defaultContainer.registerClass('printer', PrinterService, {
    lifetime: 'singleton',
  });

  // Cash Drawer Service
  const CashDrawerService = require('../../services/CashDrawer');
  defaultContainer.registerClass('cashDrawer', CashDrawerService, {
    lifetime: 'singleton',
  });

  // Database Service
  defaultContainer.register('database', () => {
    return require('../db/database');
  }, { lifetime: 'singleton' });

  // Logger Service
  defaultContainer.registerValue('logger', logger);

  // Configuration Service
  defaultContainer.registerValue('config', APP_CONFIG);
  defaultContainer.registerValue('environment', ENVIRONMENT);

  logger.debug(`Registered ${defaultContainer.getServiceNames().length} services`);
}


module.exports = {
  registerServices,
};