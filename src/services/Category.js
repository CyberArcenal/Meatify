// src/services/Category.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");

/**
 * Allowed columns for sorting (prevents SQL injection)
 */
const ALLOWED_SORT_COLUMNS = new Set([
  "id",
  "name",
  "description",
  "isActive",
  "createdAt",
  "updatedAt",
]);

class CategoryService {
  constructor() {
    this.categoryRepository = null;
    this.meatRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const Category = require("../entities/Category");
    const Meat = require("../entities/Meat");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.categoryRepository = AppDataSource.getRepository(Category);
    this.meatRepository = AppDataSource.getRepository(Meat);
    console.log("CategoryService initialized");
  }

  async getRepositories() {
    if (!this.categoryRepository) {
      await this.initialize();
    }
    return {
      category: this.categoryRepository,
      meat: this.meatRepository,
    };
  }

  /**
   * Helper: get a repository (transactional if queryRunner provided)
   * @param {import("typeorm").QueryRunner | null} qr
   * @param {Function} entityClass
   * @returns {import("typeorm").Repository<any>}
   */
  _getRepo(qr, entityClass) {
    const qrType =
      qr === null ? "null" : qr === undefined ? "undefined" : typeof qr;
    const hasManager = qr && typeof qr === "object" && !!qr.manager;
    console.log(
      `[Category._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    console.log(`[Category._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Create a new category
   * @param {Object} data - { name, description?, isActive? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const Category = require("../entities/Category");
    const repo = this._getRepo(qr, Category);

    try {
      // Validate required fields
      if (!data.name) throw new Error("name is required");

      // Check name uniqueness
      const existing = await repo.findOne({ where: { name: data.name } });
      if (existing) {
        throw new Error(`Category with name "${data.name}" already exists`);
      }

      const category = repo.create({
        name: data.name,
        description: data.description || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await saveDb(repo, category, { queryRunner: qr });
      await auditLogger.logCreate("Category", saved.id, saved, user);
      console.log(`Category created: #${saved.id} - ${saved.name}`);
      return saved;
    } catch (error) {
      console.error("Failed to create category:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing category
   * @param {number} id
   * @param {Object} data - Fields to update
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Category = require("../entities/Category");
    const repo = this._getRepo(qr, Category);

    try {
      const existing = await repo.findOne({ where: { id } });
      if (!existing) {
        throw new Error(`Category with ID ${id} not found`);
      }

      const oldData = { ...existing };

      // Check name uniqueness if changed
      if (data.name && data.name !== existing.name) {
        const duplicate = await repo.findOne({ where: { name: data.name } });
        if (duplicate && duplicate.id !== id) {
          throw new Error(`Category with name "${data.name}" already exists`);
        }
      }

      // Only allow isActive update through state service
      if (data.isActive !== undefined && data.isActive !== existing.isActive) {
        throw new Error("Use CategoryStateService to update category status");
      }

      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("Category", id, oldData, saved, user);
      console.log(`Category updated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to update category:", error.message);
      throw error;
    }
  }

  /**
   * Soft delete a category (set isActive = false)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async delete(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Category = require("../entities/Category");
    const repo = this._getRepo(qr, Category);

    try {
      const category = await repo.findOne({ where: { id } });
      if (!category) {
        throw new Error(`Category with ID ${id} not found`);
      }

      if (!category.isActive) {
        throw new Error(`Category #${id} is already inactive`);
      }

      // Check if category has active meats
      const meatRepo = this._getRepo(qr, this.meatRepository.target);
      const meatCount = await meatRepo.count({
        where: { category: { id }, isActive: true },
      });
      if (meatCount > 0) {
        throw new Error(
          `Cannot deactivate category #${id} because it has ${meatCount} active meat(s). Use CategoryStateService to handle reassignment.`
        );
      }

      const oldData = { ...category };
      category.isActive = false;
      category.updatedAt = new Date();

      const saved = await updateDb(repo, category, { queryRunner: qr });
      await auditLogger.logDelete("Category", id, oldData, user);
      console.log(`Category deactivated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to delete category:", error.message);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted category (set isActive = true)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async restore(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Category = require("../entities/Category");
    const repo = this._getRepo(qr, Category);

    try {
      const category = await repo.findOne({ where: { id } });
      if (!category) {
        throw new Error(`Category with ID ${id} not found`);
      }

      if (category.isActive) {
        throw new Error(`Category #${id} is already active`);
      }

      const oldData = { ...category };
      category.isActive = true;
      category.updatedAt = new Date();

      const saved = await updateDb(repo, category, { queryRunner: qr });
      await auditLogger.logUpdate("Category", id, oldData, saved, user);
      console.log(`Category restored: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to restore category:", error.message);
      throw error;
    }
  }

  /**
   * Permanently delete a category (hard delete) – only if no meats linked
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const Category = require("../entities/Category");
    const Meat = require("../entities/Meat");

    const categoryRepo = this._getRepo(qr, Category);
    const meatRepo = this._getRepo(qr, Meat);

    const category = await categoryRepo.findOne({ where: { id } });
    if (!category) {
      throw new Error(`Category with ID ${id} not found`);
    }

    // Check if any meats are linked to this category
    const meatCount = await meatRepo.count({
      where: { category: { id } },
    });
    if (meatCount > 0) {
      throw new Error(
        `Cannot delete category #${id} because it is used by ${meatCount} meat(s). Reassign them first.`
      );
    }

    await removeDb(categoryRepo, category, { queryRunner: qr });
    await auditLogger.logDelete("Category", id, category, user);
    console.log(`Category #${id} permanently deleted`);
  }

  /**
   * Find category by ID
   * @param {number} id
   * @param {boolean} includeInactive
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findById(id, includeInactive = false, qr = null) {
    const Category = require("../entities/Category");
    const repo = this._getRepo(qr, Category);

    const queryBuilder = repo
      .createQueryBuilder("category")
      .where("category.id = :id", { id });

    if (!includeInactive) {
      queryBuilder.andWhere("category.isActive = true");
    }

    const category = await queryBuilder.getOne();
    if (!category) {
      throw new Error(`Category with ID ${id} not found`);
    }
    await auditLogger.logView("Category", id, "system");
    return category;
  }

  /**
   * Find all categories with filters, pagination, sorting
   * @param {Object} options
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findAll(options = {}, qr = null) {
    const Category = require("../entities/Category");
    const repo = this._getRepo(qr, Category);

    const qb = repo.createQueryBuilder("category");

    // Filters
    if (options.isActive !== undefined) {
      qb.andWhere("category.isActive = :isActive", { isActive: options.isActive });
    }
    if (options.search) {
      qb.andWhere(
        "(category.name LIKE :search OR category.description LIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    // Sorting
    let sortBy = options.sortBy || "name";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(`[Category] Invalid sortBy: ${sortBy}, falling back to name`);
      sortBy = "name";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`category.${sortBy}`, sortOrder);

    // Pagination
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await auditLogger.logView("Category", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get category statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const Category = require("../entities/Category");
    const Meat = require("../entities/Meat");

    const categoryRepo = this._getRepo(qr, Category);
    const meatRepo = this._getRepo(qr, Meat);

    const totalActive = await categoryRepo.count({ where: { isActive: true } });
    const totalInactive = await categoryRepo.count({ where: { isActive: false } });

    // Categories with meat count
    const categoriesWithMeats = await categoryRepo
      .createQueryBuilder("category")
      .leftJoin("category.meats", "meat")
      .select("category.id", "id")
      .addSelect("category.name", "name")
      .addSelect("COUNT(meat.id)", "meatCount")
      .where("category.isActive = true")
      .groupBy("category.id")
      .orderBy("meatCount", "DESC")
      .getRawMany();

    // Total meats across all categories
    const totalMeats = await meatRepo.count({
      where: { isActive: true },
    });

    return {
      totalActive,
      totalInactive,
      totalMeats,
      categoriesWithMeats,
    };
  }

  /**
   * Export categories to CSV or JSON
   * @param {string} format
   * @param {Object} filters
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async exportCategories(format = "json", filters = {}, user = "system", qr = null) {
    try {
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined }, qr);
      const categories = result.data;

      let exportData;
      if (format === "csv") {
        const headers = [
          "ID",
          "Name",
          "Description",
          "Active",
          "Created At",
          "Updated At",
        ];
        const rows = categories.map((c) => [
          c.id,
          c.name,
          c.description ?? "",
          c.isActive ? "Yes" : "No",
          new Date(c.createdAt).toLocaleString(),
          c.updatedAt ? new Date(c.updatedAt).toLocaleString() : "",
        ]);
        exportData = {
          format: "csv",
          data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
          filename: `categories_export_${new Date().toISOString().split("T")[0]}.csv`,
        };
      } else {
        exportData = {
          format: "json",
          data: categories,
          filename: `categories_export_${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      await auditLogger.logExport("Category", format, filters, user);
      console.log(`Exported ${categories.length} categories in ${format} format`);
      return exportData;
    } catch (error) {
      console.error("Failed to export categories:", error);
      throw error;
    }
  }

  /**
   * Bulk create categories
   * @param {Array<Object>} categoriesArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(categoriesArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of categoriesArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ category: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Bulk update categories
   * @param {Array<{ id: number, updates: Object }>} updatesArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkUpdate(updatesArray, user = "system", qr = null) {
    const results = { updated: [], errors: [] };
    for (const { id, updates } of updatesArray) {
      try {
        const saved = await this.update(id, updates, user, qr);
        results.updated.push(saved);
      } catch (err) {
        results.errors.push({ id, updates, error: err.message });
      }
    }
    return results;
  }

  /**
   * Import categories from CSV file
   * @param {string} filePath
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async importFromCSV(filePath, user = "system", qr = null) {
    const fs = require("fs").promises;
    const csv = require("csv-parse/sync");
    const fileContent = await fs.readFile(filePath, "utf-8");
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const results = { imported: [], errors: [] };
    for (const record of records) {
      try {
        const data = {
          name: record.name,
          description: record.description || null,
          isActive: record.isActive !== "false",
        };
        if (!data.name) {
          throw new Error("name is required");
        }
        const saved = await this.create(data, user, qr);
        results.imported.push(saved);
      } catch (err) {
        results.errors.push({ row: record, error: err.message });
      }
    }
    return results;
  }
}

// Singleton instance
const categoryService = new CategoryService();
module.exports = categoryService;