// src/stateServices/sale/modules/SaleLoyaltyModule.js
//@ts-check
const { logger } = require("../../../utils/logger");

const Customer = require("../../../entities/Customer");
const LoyaltyTransaction = require("../../../entities/LoyaltyTransaction");
const system = require("../../../utils/system");

/**
 * SaleLoyaltyModule - Handles loyalty operations for sale events.
 * This includes earning/redeeming points and reversing points on refund.
 */
class SaleLoyaltyModule {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.customerRepo = dataSource.getRepository(Customer);
    this.loyaltyRepo = dataSource.getRepository(LoyaltyTransaction);
  }

  /**
   * Helper: get repository (transactional)
   */
  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
  }

  /**
   * Handle loyalty points for a paid sale (earn + redeem)
   * @param {Object} sale - The sale entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<{ pointsEarned: number, updatedCustomer: any }>}
   */
  async handleLoyalty(sale, user = "system", queryRunner = null) {
    const { updateDb, saveDb } = require("../../../utils/dbUtils/dbActions");
    const loyaltyEnabled = await system.loyaltyPointsEnabled();
    let pointsEarned = 0;
    let updatedCustomer = null;

    if (loyaltyEnabled && sale.customer) {
      const rate = await system.getLoyaltyPointRate();
      const netSpend = sale.totalAmount - (sale.loyaltyRedeemed || 0);
      pointsEarned = Math.floor(netSpend / rate);
      sale.pointsEarn = pointsEarned;

      const customerRepo = this._getRepo(queryRunner, this.customerRepo.target);
      const customer = await customerRepo.findOne({
        where: { id: sale.customer.id },
      });

      if (customer) {
        // Earn points
        if (pointsEarned > 0) {
          const oldBalance = customer.loyaltyPointsBalance;
          customer.loyaltyPointsBalance += pointsEarned;
          customer.lifetimePointsEarned = (customer.lifetimePointsEarned || 0) + pointsEarned;
          customer.updatedAt = new Date();
          updatedCustomer = await updateDb(customerRepo, customer, { queryRunner });

          // Create earn transaction
          const loyaltyRepo = this._getRepo(queryRunner, this.loyaltyRepo.target);
          const tx = loyaltyRepo.create({
            pointsChange: pointsEarned,
            transactionType: "earn",
            notes: `Sale #${sale.id}`,
            customer: updatedCustomer,
            sale: sale,
            timestamp: new Date(),
          });
          await saveDb(loyaltyRepo, tx, { queryRunner });
        }

        // Redeem points
        if (sale.loyaltyRedeemed > 0) {
          const loyaltyRepo = this._getRepo(queryRunner, this.loyaltyRepo.target);
          const redeemTx = loyaltyRepo.create({
            pointsChange: -sale.loyaltyRedeemed,
            transactionType: "redeem",
            notes: `Redeemed on Sale #${sale.id}`,
            customer: customer,
            sale: sale,
            timestamp: new Date(),
          });
          await saveDb(loyaltyRepo, redeemTx, { queryRunner });
        }
      }
    }

    return { pointsEarned, updatedCustomer };
  }

  /**
   * Reverse loyalty points for a refunded sale
   * @param {Object} sale - The sale entity
   * @param {string} reason - Refund reason
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async reverseLoyalty(sale, reason = "", user = "system", queryRunner = null) {
    const { updateDb, saveDb } = require("../../../utils/dbUtils/dbActions");
    if (sale.pointsEarn <= 0 || !sale.customer) return;

    const customerRepo = this._getRepo(queryRunner, this.customerRepo.target);
    const loyaltyRepo = this._getRepo(queryRunner, this.loyaltyRepo.target);

    const customer = await customerRepo.findOne({
      where: { id: sale.customer.id },
    });

    if (customer) {
      const oldBalance = customer.loyaltyPointsBalance;
      customer.loyaltyPointsBalance -= sale.pointsEarn;
      customer.updatedAt = new Date();
      await updateDb(customerRepo, customer, { queryRunner });

      // Create reversal transaction
      const tx = loyaltyRepo.create({
        pointsChange: -sale.pointsEarn,
        transactionType: "refund",
        notes: `Refund of sale #${sale.id} - ${reason}`,
        customer: customer,
        sale: sale,
        timestamp: new Date(),
      });
      await saveDb(loyaltyRepo, tx, { queryRunner });

      logger.info(`[SaleLoyalty] Reversed ${sale.pointsEarn} points for customer #${customer.id}`);
    }
  }
}

module.exports = SaleLoyaltyModule;