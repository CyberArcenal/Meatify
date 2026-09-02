// src/main/index.js (UPDATED with Service Container)

//@ts-check

/**
 * @file Main entry point for Meatify System
 * @version 1.0.0
 * @author CyberArcenal
 * @description Modular Electron main process with DI container
 */

const { loadEnv } = require("./core/load-env");
loadEnv(); // Before anything else

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
} = require("./core/database");
const { registerIpcHandlers, runSchedulers } = require("./core/ipc-registry");

// Service Container
const { defaultContainer } = require("./core/service-container");
const { registerServices } = require("./core/register-services");
const { registerUpdateModule } = require("./core/register-update-module");

// ===================== REGISTER SCHEMES BEFORE APP READY =====================
registerCustomSchemes(); // ✅ DAPAT NASA TOP-LEVEL

// ===================== GLOBAL STATE =====================
let isShuttingDown = false;
/**
 * @type {BrowserWindow | null | undefined}
 */
let mainWindow = null; // ✅ store window reference here
/**
 * @type {BrowserWindow | null}
 */
let splashWindow = null;

// ===================== MAIN STARTUP =====================

async function startupSequence() {
  try {
    logger.info(`🚀 Starting ${APP_CONFIG.appName} v${APP_CONFIG.version}...`);
    logger.info(`Environment: ${getEnvironmentName()}`);
    logger.info(`User Data Path: ${APP_CONFIG.userDataPath}`);

    // 1. Register custom protocols (no window needed)
    registerCustomProtocolHandlers();

    // 2. Register services in DI container (pass null for windows)
    await registerServices(null, null);
    defaultContainer.lock();

    // 3. Create splash window and store reference
    splashWindow = await createSplashWindow();

    // 4. Initialize database
    const dbResult = await initializeDatabase(splashWindow);

    if (!dbResult.success) {
      // @ts-ignore
      logger.error("Database initialization failed:", dbResult.message);
      const userChoice = dialog.showMessageBoxSync({
        type: "warning",
        title: "Database Warning",
        message: "Database initialization failed",
        // @ts-ignore
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

    // 5. Get services from container
    const printerService = defaultContainer.get("printer");
    const cashDrawerService = defaultContainer.get("cashDrawer");

    // 6. Create main window and store reference
    mainWindow = await createMainWindow((/** @type {BrowserWindow} */ window) => {
      registerIpcHandlers(window, { printerService, cashDrawerService });
      runSchedulers();
    });

    // 7. Setup global error handlers (after window exists)
    setupGlobalErrorHandlers(mainWindow);

    // 8. Log service initialization
    if (APP_CONFIG.isDev) {
      defaultContainer.dump();
    }

    // 9. Attach updater with the actual window instance
    await registerUpdateModule(mainWindow);

    logger.success(`✅ ${APP_CONFIG.appName} started successfully!`);
  } catch (error) {
    logger.error("Startup sequence failed:", error);

    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }

    // Only create error window if app is not quitting
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
        // @ts-ignore
        error.message
      );

      errorWindow.show();
    }
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

    // ✅ Re-set the updater window reference after creating a new window
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
      // Clean up services
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
  };
}