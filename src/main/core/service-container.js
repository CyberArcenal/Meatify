// src/main/core/service-container.js

/**
 * Service Container / Dependency Injection Container
 *
 * Manages service instances and their dependencies
 * Supports singleton and transient lifetimes
 */

const { logger } = require("./logger");

/**
 * @typedef {Object} ServiceDefinition
 * @property {Function} factory - Factory function that creates the service
 * @property {Array<string>} dependencies - Names of dependent services
 * @property {string} lifetime - 'singleton' or 'transient'
 * @property {any} instance - Cached instance (for singletons)
 * @property {boolean} initialized - Whether the service has been initialized
 */

class ServiceContainer {
  constructor() {
    /** @type {Map<string, ServiceDefinition>} */
    this.definitions = new Map();

    /** @type {Map<string, any>} */
    this.instances = new Map();

    /** @type {Map<string, boolean>} */
    this.initializing = new Map();

    /** @type {Array<string>} */
    this.initializationOrder = [];

    /** @type {boolean} */
    this.locked = false;
  }

  /**
   * Register a service
   * @param {string} name - Service name (unique identifier)
   * @param {Function} factory - Factory function that returns the service instance
   * @param {Object} options
   * @param {Array<string>} [options.dependencies=[]] - Names of services this depends on
   * @param {string} [options.lifetime='singleton'] - 'singleton' or 'transient'
   */
  register(name, factory, options = {}) {
    if (this.locked) {
      throw new Error(
        `Cannot register service "${name}" after container is locked`,
      );
    }

    if (this.definitions.has(name)) {
      logger.warn(`Service "${name}" is already registered, overwriting...`);
    }

    this.definitions.set(name, {
      factory,
      dependencies: options.dependencies || [],
      lifetime: options.lifetime || "singleton",
      instance: null,
      initialized: false,
    });

    logger.debug(
      `Registered service: ${name} (${options.lifetime || "singleton"})`,
    );
    return this;
  }


  async resolve(name) {
    const instance = this.get(name);
    if (instance && typeof instance.initialize === "function") {
      await instance.initialize();
    }
    return instance;
  }

  /**
   * Register a service with its class
   * @param {string} name - Service name
   * @param {Function} Class - Class constructor
   * @param {Object} options
   * @param {Array<string>} [options.dependencies=[]] - Dependencies
   * @param {string} [options.lifetime='singleton'] - 'singleton' or 'transient'
   * @param {Array<any>} [options.args=[]] - Constructor arguments
   */
  registerClass(name, Class, options = {}) {
    const { dependencies = [], lifetime = "singleton", args = [] } = options;

    return this.register(
      name,
      () => {
        // Resolve dependencies
        const resolvedDeps = dependencies.map((depName) => this.get(depName));
        return new Class(...args, ...resolvedDeps);
      },
      { dependencies, lifetime },
    );
  }

  /**
   * Register a value/instance directly
   * @param {string} name - Service name
   * @param {any} instance - The instance to register
   */
  registerValue(name, instance) {
    if (this.locked) {
      throw new Error(
        `Cannot register service "${name}" after container is locked`,
      );
    }

    this.instances.set(name, instance);
    this.definitions.set(name, {
      factory: () => instance,
      dependencies: [],
      lifetime: "singleton",
      instance,
      initialized: true,
    });

    logger.debug(`Registered value service: ${name}`);
    return this;
  }

  /**
   * Get a service instance
   * @param {string} name - Service name
   * @returns {any} The service instance
   */
  get(name) {
    // Check if already resolved
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }

    // Check if definition exists
    if (!this.definitions.has(name)) {
      throw new Error(`Service "${name}" not found in container`);
    }

    // Check for circular dependencies
    if (this.initializing.has(name)) {
      const chain = Array.from(this.initializing.keys());
      throw new Error(
        `Circular dependency detected: ${chain.join(" -> ")} -> ${name}`,
      );
    }

    const definition = this.definitions.get(name);
    this.initializing.set(name, true);

    try {
      // Resolve dependencies
      const deps = definition.dependencies.map((depName) => this.get(depName));

      // Create instance
      let instance = definition.factory(...deps);

      // If singleton and not initialized, cache it
      if (definition.lifetime === "singleton") {
        definition.instance = instance;
        definition.initialized = true;
        this.instances.set(name, instance);
      } else {
        // For transient, just return the instance
        this.instances.set(name, instance);
      }

      // Call initialize method if it exists
      if (instance && typeof instance.initialize === "function") {
        // Store instance temporarily for initialize call
        this.instances.set(name, instance);
        instance.initialize();
      }

      this.initializationOrder.push(name);
      logger.debug(`Resolved service: ${name}`);
      return instance;
    } finally {
      this.initializing.delete(name);
    }
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean}
   */
  has(name) {
    return this.definitions.has(name);
  }

  /**
   * Check if a service has been initialized
   * @param {string} name - Service name
   * @returns {boolean}
   */
  isInitialized(name) {
    const def = this.definitions.get(name);
    return def ? def.initialized : false;
  }

  /**
   * Get all registered service names
   * @returns {Array<string>}
   */
  getServiceNames() {
    return Array.from(this.definitions.keys());
  }

  /**
   * Get initialization order
   * @returns {Array<string>}
   */
  getInitializationOrder() {
    return [...this.initializationOrder];
  }

  /**
   * Lock the container (prevents new registrations)
   */
  lock() {
    this.locked = true;
    logger.debug("Service container locked");
  }

  /**
   * Reset the container (for testing)
   */
  reset() {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Cannot reset container in production");
    }

    this.definitions.clear();
    this.instances.clear();
    this.initializing.clear();
    this.initializationOrder = [];
    this.locked = false;
    logger.debug("Service container reset");
  }

  /**
   * Get all currently initialized instances
   * @returns {Map<string, any>}
   */
  getInitializedInstances() {
    return new Map(this.instances);
  }

  /**
   * Dump service info for debugging
   */
  dump() {
    const info = {
      totalServices: this.definitions.size,
      initialized: this.instances.size,
      initializationOrder: this.initializationOrder,
      services: Array.from(this.definitions.entries()).map(([name, def]) => ({
        name,
        lifetime: def.lifetime,
        initialized: def.initialized,
        dependencies: def.dependencies,
      })),
    };
    console.table(info.services);
    return info;
  }
}

/**
 * Create a new service container instance
 * @returns {ServiceContainer}
 */
function createServiceContainer() {
  return new ServiceContainer();
}

/**
 * Get the default service container
 * (Singleton instance)
 */
const defaultContainer = new ServiceContainer();

module.exports = {
  ServiceContainer,
  createServiceContainer,
  defaultContainer,
};
