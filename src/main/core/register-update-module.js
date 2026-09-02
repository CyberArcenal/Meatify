//@ts-check

const { LogLevel, logger } = require("./logger.js");

/**
 * @param {any} mainWindow
 */
async function registerUpdateModule(mainWindow) {
  // Attach updater (existing)
  try {
    const updaterModule = require("../ipc/utils/updater/index.ipc.js");
    updaterModule.setMainWindow(mainWindow);
    logger.info("Updater handler attached to main window");
  } catch (e) {
    logger.warn("Failed to set updater main window", e);
  }
}

module.exports = {
  registerUpdateModule,
};
