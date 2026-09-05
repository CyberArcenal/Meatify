// src/main/index.js
//@ts-check

const { loadEnv } = require("./core/load-env");

// ===================== CORE IMPORTS =====================
const { app, dialog, BrowserWindow } = require("electron");

// Core modules
const { APP_CONFIG } = require("./core/app-config");
const { ENVIRONMENT, getEnvironmentName } = require("./core/environment");
const { logger } = require("./core/logger");
const { setupGlobalErrorHandlers } = require("./core/error-handler");
const {
  registerCustomProtocolHandlers,
  registerCustomSchemes,
} = require("./core/protocol-utils");
const {
  createSplashWindow,
  createMainWindow,
  showErrorPage,
} = require("./core/window-manager");
const {
  initializeDatabase,
  safeCloseDatabase,
  isDatabaseInitialized,
} = require("./core/database");
const { registerIpcHandlers, runSchedulers } = require("./core/ipc-registry");

// Service Container
const { defaultContainer } = require("./core/service-container");
const { registerServices } = require("./core/register-services");
const { registerUpdateModule } = require("./core/register-update-module");

// ===================== REGISTER SCHEMES BEFORE APP READY =====================
registerCustomSchemes();

// ===================== GLOBAL STATE =====================
let isShuttingDown = false;
let mainWindow = null;
let splashWindow = null;
let isAppReady = false;

// ===================== MAIN STARTUP =====================

async function startupSequence() {
  try {
    // ✅ Load environment
    loadEnv();
    logger.info(`✅ Environment loaded`);

    logger.info(`🚀 Starting ${APP_CONFIG.appName} v${APP_CONFIG.version}...`);
    logger.info(`Environment: ${getEnvironmentName()}`);
    logger.info(`User Data Path: ${APP_CONFIG.userDataPath}`);

    // 1. Register custom protocols
    registerCustomProtocolHandlers();

    // 2. Register services in DI container
    await registerServices(null, null);
    defaultContainer.lock();

    // 3. Create splash window
    splashWindow = await createSplashWindow();

    // 4. Initialize database
    const dbResult = await initializeDatabase(splashWindow);

    if (!dbResult.success) {
      logger.error("Database initialization failed:", dbResult.message);
      const userChoice = dialog.showMessageBoxSync({
        type: "warning",
        title: "Database Warning",
        message: "Database initialization failed",
        detail: `${dbResult.message}\n\nApplication may have limited functionality.`,
        buttons: ["Continue Anyway", "Quit Application"],
        defaultId: 0,
        cancelId: 1,
      });
      if (userChoice === 1) {
        logger.info("User chose to quit due to database error");
        app.quit();
        return;
      }
    }

    // ✅ 5. Initialize ALL core services BEFORE creating main window
    logger.info("Initializing core services...");
    await initializeCoreServices();
    logger.info("✅ Core services initialized");

    // 6. Get services from container
    const printerService = defaultContainer.get("printer");
    const cashDrawerService = defaultContainer.get("cashDrawer");

    // 7. Create main window
    mainWindow = await createMainWindow((window) => {
      registerIpcHandlers(window, { printerService, cashDrawerService });
      runSchedulers();
    });

    // 8. Setup global error handlers
    setupGlobalErrorHandlers(mainWindow);

    // 9. Log service initialization
    if (APP_CONFIG.isDev) {
      defaultContainer.dump();
    }

    // 10. Attach updater
    await registerUpdateModule(mainWindow);

    // ✅ 11. Send "app-ready" event to renderer
    sendAppReadyEvent();

    logger.success(`✅ ${APP_CONFIG.appName} started successfully!`);
  } catch (error) {
    logger.error("Startup sequence failed:", error);

    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }

    if (!isShuttingDown) {
      const errorWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        frame: true,
        webPreferences: {
          contextIsolation: false,
          nodeIntegration: true,
        },
      });

      showErrorPage(
        errorWindow,
        "Startup Failed",
        "The application failed to start properly.",
        error.message
      );

      errorWindow.show();
    }
  }
}

/**
 * ✅ Initialize all core services before main window loads
 */
async function initializeCoreServices() {
  const coreServices = [
    'meatService',
    'categoryService',
    'supplierService',
    'customerService',
    'batchService',
    'saleService',
    'saleItemService',
    'purchaseService',
    'returnRefundService',
    'loyaltyTransactionService',
    'inventoryMovementService',
    'notificationService',
    'notificationLogService',
    'systemSettingService',
    'auditLogService',
  ];

  const results = [];
  for (const serviceName of coreServices) {
    try {
      if (defaultContainer.has(serviceName)) {
        const instance = defaultContainer.get(serviceName);
        // If service has an initialize method, call it
        if (instance && typeof instance.initialize === 'function') {
          await instance.initialize();
        }
        results.push({ name: serviceName, status: 'initialized' });
        logger.debug(`✅ Service initialized: ${serviceName}`);
      } else {
        logger.debug(`⚠️ Service not registered: ${serviceName}`);
      }
    } catch (error) {
      logger.error(`❌ Failed to initialize service ${serviceName}:`, error);
      results.push({ name: serviceName, status: 'failed', error: error.message });
    }
  }

  // Wait a moment for connections to stabilize
  await new Promise(resolve => setTimeout(resolve, 500));

  return results;
}

/**
 * ✅ Send app-ready event to renderer
 */
function sendAppReadyEvent() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    isAppReady = true;
    mainWindow.webContents.send('app:ready', {
      timestamp: new Date().toISOString(),
      databaseReady: isDatabaseInitialized,
      version: APP_CONFIG.version,
    });
    logger.info('✅ Sent app:ready event to renderer');
  }
}

// ===================== APPLICATION EVENTS =====================

app.on("ready", startupSequence);

app.on("window-all-closed", async () => {
  logger.info("All windows closed");
  await safeCloseDatabase();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  logger.info("Application activated");

  if (BrowserWindow.getAllWindows().length === 0) {
    await startupSequence();

    try {
      const updaterModule = require("./ipc/utils/updater/index.ipc.js");
      updaterModule.setMainWindow(mainWindow);
      logger.info("Updater handler re-attached to main window after activate");
    } catch (e) {
      logger.warn("Failed to re-attach updater on activate", e);
    }
  }
});

app.on("before-quit", async (event) => {
  logger.info("Application quitting...");

  if (!isShuttingDown) {
    isShuttingDown = true;
    event.preventDefault();

    try {
      const services = defaultContainer.getInitializedInstances();
      for (const [name, instance] of services) {
        if (instance && typeof instance.cleanup === "function") {
          try {
            await instance.cleanup();
            logger.debug(`Cleaned up service: ${name}`);
          } catch (err) {
            logger.error(`Error cleaning up service ${name}:`, err);
          }
        }
      }
    } catch (error) {
      logger.error("Error during service cleanup:", error);
    }

    await safeCloseDatabase();
    app.quit();
  }
});

app.on("will-quit", () => logger.info("Application will quit"));
app.on("quit", () => {
  logger.info("Application quit");
  process.exit(0);
});

// ===================== EXPORTS =====================
if (APP_CONFIG.isDev) {
  module.exports = {
    APP_CONFIG,
    ENVIRONMENT,
    defaultContainer,
    startupSequence,
    safeCloseDatabase,
    isAppReady,
  };
}