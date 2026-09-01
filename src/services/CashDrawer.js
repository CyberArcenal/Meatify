// src/services/CashDrawerService.js
//@ts-check

const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const system = require("../utils/system"); // ✅ ADDED - for flexible settings

class CashDrawerService {
  constructor() {
    this.driver = null;
    this.isOpen = false;
    this.driverType = null;
  }

  /**
   * ✅ NEW: Check if audit logging is enabled
   * @returns {Promise<boolean>}
   */
  async _isAuditEnabled() {
    try {
      return await system.auditLogEnabled();
    } catch (error) {
      logger.warn(`[CashDrawerService] Failed to check audit enabled status: ${error.message}, defaulting to true`);
      return true;
    }
  }

  /**
   * ✅ NEW: Get drawer open timeout from settings
   * @returns {Promise<number>}
   */
  async _getDrawerTimeout() {
    try {
      return await system.getInt("cash_drawer_timeout", "cashier", 5);
    } catch (error) {
      logger.warn(`[CashDrawerService] Failed to get drawer timeout: ${error.message}, defaulting to 5`);
      return 5;
    }
  }

  /**
   * ✅ NEW: Get retry attempts from settings
   * @returns {Promise<number>}
   */
  async _getRetryAttempts() {
    try {
      return await system.getInt("cash_drawer_retry_attempts", "cashier", 3);
    } catch (error) {
      logger.warn(`[CashDrawerService] Failed to get retry attempts: ${error.message}, defaulting to 3`);
      return 3;
    }
  }

  /**
   * ✅ NEW: Get retry delay from settings (in milliseconds)
   * @returns {Promise<number>}
   */
  async _getRetryDelay() {
    try {
      return await system.getInt("cash_drawer_retry_delay_ms", "cashier", 1000);
    } catch (error) {
      logger.warn(`[CashDrawerService] Failed to get retry delay: ${error.message}, defaulting to 1000`);
      return 1000;
    }
  }

  /**
   * ✅ NEW: Get cash drawer connection type (with validation)
   * @returns {Promise<string>}
   */
  async _getConnectionType() {
    try {
      const type = await system.cashDrawerConnectionType();
      const validTypes = ["printer", "usb", "serial", "network"];
      if (!validTypes.includes(type)) {
        logger.warn(`[CashDrawerService] Invalid connection type "${type}", defaulting to "printer"`);
        return "printer";
      }
      return type;
    } catch (error) {
      logger.warn(`[CashDrawerService] Failed to get connection type: ${error.message}, defaulting to "printer"`);
      return "printer";
    }
  }

  /**
   * ✅ NEW: Get drawer open code (with validation)
   * @returns {Promise<number>}
   */
  async _getDrawerPin() {
    try {
      const code = await system.drawerOpenCode();
      const pin = parseInt(code.trim(), 10);
      if (isNaN(pin) || pin < 0 || pin > 255) {
        logger.warn(`[CashDrawerService] Invalid drawer pin "${code}", defaulting to 0`);
        return 0;
      }
      return pin;
    } catch (error) {
      logger.warn(`[CashDrawerService] Failed to get drawer pin: ${error.message}, defaulting to 0`);
      return 0;
    }
  }

  /**
   * ✅ NEW: Check if cash drawer is enabled
   * @returns {Promise<boolean>}
   */
  async _isDrawerEnabled() {
    try {
      return await system.enableCashDrawer();
    } catch (error) {
      logger.warn(`[CashDrawerService] Failed to check drawer enabled: ${error.message}, defaulting to true`);
      return true;
    }
  }

  async _loadDriver() {
    const connectionType = await this._getConnectionType();

    if (connectionType === "printer") {
      // Reuse the thermal printer driver (which can send drawer commands)
      const ThermalDriver = require("../drivers/thermal");
      this.driverType = "printer";
      return new ThermalDriver();
    } else if (connectionType === "usb") {
      // Dedicated USB cash drawer driver (e.g., via serial or HID)
      // You need to implement this driver based on your hardware
      const UsbDrawerDriver = require("../drivers/usbDrawer");
      this.driverType = "usb";
      return new UsbDrawerDriver();
    } else if (connectionType === "serial") {
      // Serial port cash drawer driver
      // You need to implement this driver based on your hardware
      const SerialDrawerDriver = require("../drivers/serialDrawer");
      this.driverType = "serial";
      return new SerialDrawerDriver();
    } else if (connectionType === "network") {
      // Network/Ethernet cash drawer driver
      // You need to implement this driver based on your hardware
      const NetworkDrawerDriver = require("../drivers/networkDrawer");
      this.driverType = "network";
      return new NetworkDrawerDriver();
    } else {
      throw new Error(
        `Unsupported cash drawer connection type: ${connectionType}`
      );
    }
  }

  async _getDriver() {
    if (!this.driver) {
      this.driver = await this._loadDriver();
      logger.debug(`[CashDrawerService] Driver loaded (type: ${this.driverType})`);
    }
    return this.driver;
  }

  /**
   * ✅ NEW: Reload driver (for settings changes)
   * @returns {Promise<void>}
   */
  async reloadDriver() {
    logger.debug("[CashDrawerService] Reloading driver...");
    this.driver = null;
    this.driverType = null;
    this.isOpen = false;
    await this._getDriver();
    logger.debug(`[CashDrawerService] Driver reloaded (type: ${this.driverType})`);
  }

  /**
   * Open the cash drawer if enabled.
   * @param {string} reason - Reason for opening (e.g., "sale", "refund", "test")
   * @param {Object} options - Additional options
   * @param {number} [options.retryAttempts] - Override retry attempts
   * @param {number} [options.retryDelay] - Override retry delay in ms
   * @returns {Promise<boolean>}
   */
  async openDrawer(reason = "sale", options = {}) {
    const notificationService = require("./Notification");

    // ✅ Check if drawer is enabled via settings
    const drawerEnabled = await this._isDrawerEnabled();
    if (!drawerEnabled) {
      logger.debug("[CashDrawerService] Cash drawer is disabled in settings");
      throw new Error("Cash drawer is disabled in settings");
    }

    const retryAttempts = options.retryAttempts || await this._getRetryAttempts();
    const retryDelay = options.retryDelay || await this._getRetryDelay();
    const drawerTimeout = await this._getDrawerTimeout();

    let lastError = null;

    // ✅ Retry logic for opening drawer
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const driver = await this._getDriver();

        // Check if driver supports openDrawer
        if (typeof driver.openDrawer !== "function") {
          console.warn(
            "[CashDrawerService] Current driver does not support openDrawer",
          );
          throw new Error("Current driver does not support openDrawer");
        }

        // ✅ Get pin from settings
        const pin = await this._getDrawerPin();

        // Open drawer with timeout
        const openPromise = driver.openDrawer(pin);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Drawer open timeout after ${drawerTimeout} seconds`)), drawerTimeout * 1000);
        });

        await Promise.race([openPromise, timeoutPromise]);

        this.isOpen = true;

        // ✅ Check if audit logging is enabled before logging
        const auditEnabled = await this._isAuditEnabled();
        if (auditEnabled) {
          await auditLogger.logCreate(
            "CashDrawerEvent",
            null,
            { action: "openDrawer", reason, attempt, driverType: this.driverType },
            "system",
          );
        }

        logger.debug(`[CashDrawerService] Drawer opened (${reason}) on attempt ${attempt}`);
        return true;

      } catch (err) {
        // @ts-ignore
        lastError = err;
        this.isOpen = false;

        if (attempt < retryAttempts) {
          logger.warn(`[CashDrawerService] Failed to open drawer (attempt ${attempt}/${retryAttempts}): ${err.message}`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          logger.error(`[CashDrawerService] Failed to open drawer after ${retryAttempts} attempts: ${err.message}`);
        }
      }
    }

    // All attempts failed
    // @ts-ignore
    console.error("[CashDrawerService] Failed to open drawer:", lastError?.message);

    try {
      // await notificationService.create(
      //   {
      //     userId: 1,
      //     title: "Cash Drawer Error",
      //     // @ts-ignore
      //     message: `Failed to open cash drawer (${reason}) after ${retryAttempts} attempts: ${lastError?.message}`,
      //     type: "error",
      //     metadata: {
      //       reason,
      //       // @ts-ignore
      //       error: lastError?.message,
      //       // @ts-ignore
      //       stack: lastError?.stack,
      //       attempts: retryAttempts,
      //       driverType: this.driverType,
      //     },
      //   },
      //   "system",
      // );
    } catch (notifErr) {
      console.error(
        "Failed to send error notification for cash drawer",
        notifErr,
      );
    }

    throw lastError || new Error("Failed to open cash drawer");
  }

  /**
   * ✅ NEW: Test the cash drawer connection
   * @param {Object} options - Test options
   * @param {number} [options.retryAttempts] - Override retry attempts
   * @returns {Promise<{ success: boolean, message: string, details?: any }>}
   */
  async testDrawer(options = {}) {
    try {
      const drawerEnabled = await this._isDrawerEnabled();
      if (!drawerEnabled) {
        return {
          success: false,
          message: "Cash drawer is disabled in settings",
        };
      }

      const connectionType = await this._getConnectionType();
      const pin = await this._getDrawerPin();

      // Try to open drawer with retry
      await this.openDrawer("test", options);

      return {
        success: true,
        message: `Cash drawer test successful (connection: ${connectionType}, pin: ${pin})`,
        details: {
          connectionType,
          pin,
          driverType: this.driverType,
        },
      };
    } catch (error) {
      // @ts-ignore
      return {
        success: false,
        message: `Cash drawer test failed: ${error.message}`,
        // @ts-ignore
        details: { error: error.message },
      };
    }
  }

  /**
   * ✅ NEW: Get cash drawer configuration
   * @returns {Promise<{ enabled: boolean, connectionType: string, pin: number, driverLoaded: boolean, driverType: string | null }>}
   */
  async getConfig() {
    const [enabled, connectionType, pin] = await Promise.all([
      this._isDrawerEnabled(),
      this._getConnectionType(),
      this._getDrawerPin(),
    ]);

    return {
      enabled,
      connectionType,
      pin,
      driverLoaded: !!this.driver,
      driverType: this.driverType,
      isOpen: this.isOpen,
    };
  }

  getStatus() {
    return {
      driverLoaded: !!this.driver,
      driverType: this.driverType,
      isOpen: this.isOpen,
    };
  }

  isAvailable() {
    return !!this.driver;
  }
}

module.exports = CashDrawerService;