/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

/**
 * @class
 * @implements {MigrationInterface}
 */
module.exports = class InitSchema1787889659494 {
    name = 'InitSchema1787889659494'

    /**
     * @param {QueryRunner} queryRunner
     */
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "temporary_categories" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "description" varchar, "isActive" boolean NOT NULL DEFAULT (1), "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime, "address" varchar, "notes" varchar)`);
        await queryRunner.query(`INSERT INTO "temporary_categories"("id", "name", "description", "isActive", "createdAt", "updatedAt") SELECT "id", "name", "description", "isActive", "createdAt", "updatedAt" FROM "categories"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`ALTER TABLE "temporary_categories" RENAME TO "categories"`);
        await queryRunner.query(`CREATE TABLE "temporary_purchases" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "referenceNo" varchar NOT NULL, "orderDate" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "status" varchar CHECK( "status" IN ('pending','approved','completed','cancelled') ) NOT NULL DEFAULT ('pending'), "totalAmount" decimal NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime, "supplierId" integer, "notes" varchar, CONSTRAINT "FK_77980c752fdeb3689e318fde424" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_purchases"("id", "referenceNo", "orderDate", "status", "totalAmount", "createdAt", "updatedAt", "supplierId") SELECT "id", "referenceNo", "orderDate", "status", "totalAmount", "createdAt", "updatedAt", "supplierId" FROM "purchases"`);
        await queryRunner.query(`DROP TABLE "purchases"`);
        await queryRunner.query(`ALTER TABLE "temporary_purchases" RENAME TO "purchases"`);
        await queryRunner.query(`CREATE TABLE "temporary_suppliers" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "contactInfo" varchar, "email" varchar, "phone" varchar, "address" varchar, "isActive" boolean NOT NULL DEFAULT (1), "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime, "notes" varchar)`);
        await queryRunner.query(`INSERT INTO "temporary_suppliers"("id", "name", "contactInfo", "email", "phone", "address", "isActive", "createdAt", "updatedAt") SELECT "id", "name", "contactInfo", "email", "phone", "address", "isActive", "createdAt", "updatedAt" FROM "suppliers"`);
        await queryRunner.query(`DROP TABLE "suppliers"`);
        await queryRunner.query(`ALTER TABLE "temporary_suppliers" RENAME TO "suppliers"`);
        await queryRunner.query(`CREATE TABLE "temporary_loyalty_transactions" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "transactionType" varchar CHECK( "transactionType" IN ('earn','redeem','adjustment','refund') ) NOT NULL DEFAULT ('earn'), "pointsChange" integer NOT NULL, "timestamp" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "notes" varchar, "updatedAt" datetime, "customerId" integer, "saleId" integer, CONSTRAINT "FK_05f83aa6296690a91ef26552958" FOREIGN KEY ("saleId") REFERENCES "sales" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_652010695a854dd52f21ceb485f" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_loyalty_transactions"("id", "transactionType", "pointsChange", "timestamp", "notes", "updatedAt", "customerId", "saleId") SELECT "id", "transactionType", "pointsChange", "timestamp", "notes", "updatedAt", "customerId", "saleId" FROM "loyalty_transactions"`);
        await queryRunner.query(`DROP TABLE "loyalty_transactions"`);
        await queryRunner.query(`ALTER TABLE "temporary_loyalty_transactions" RENAME TO "loyalty_transactions"`);
        await queryRunner.query(`CREATE TABLE "temporary_sales" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "timestamp" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "status" varchar CHECK( "status" IN ('initiated','paid','refunded','voided') ) NOT NULL DEFAULT ('initiated'), "paymentMethod" varchar CHECK( "paymentMethod" IN ('cash','card','wallet') ) NOT NULL DEFAULT ('cash'), "totalAmount" real NOT NULL DEFAULT (0), "usedLoyalty" boolean NOT NULL DEFAULT (0), "loyaltyRedeemed" integer NOT NULL DEFAULT (0), "usedDiscount" boolean NOT NULL DEFAULT (0), "totalDiscount" real NOT NULL DEFAULT (0), "usedVoucher" boolean NOT NULL DEFAULT (0), "voucherCode" text, "pointsEarn" real NOT NULL DEFAULT (0), "notes" text, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime, "customerId" integer, "deletedAt" datetime, CONSTRAINT "FK_3a92cf6add00043cef9833db1cd" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_sales"("id", "timestamp", "status", "paymentMethod", "totalAmount", "usedLoyalty", "loyaltyRedeemed", "usedDiscount", "totalDiscount", "usedVoucher", "voucherCode", "pointsEarn", "notes", "createdAt", "updatedAt", "customerId", "deletedAt") SELECT "id", "timestamp", "status", "paymentMethod", "totalAmount", "usedLoyalty", "loyaltyRedeemed", "usedDiscount", "totalDiscount", "usedVoucher", "voucherCode", "pointsEarn", "notes", "createdAt", "updatedAt", "customerId", "deletedAt" FROM "sales"`);
        await queryRunner.query(`DROP TABLE "sales"`);
        await queryRunner.query(`ALTER TABLE "temporary_sales" RENAME TO "sales"`);
        await queryRunner.query(`DROP INDEX "IDX_notification_status_created"`);
        await queryRunner.query(`DROP INDEX "IDX_notification_recipient"`);
        await queryRunner.query(`DROP INDEX "IDX_notification_status"`);
        await queryRunner.query(`CREATE TABLE "temporary_notification_logs" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "recipient_email" varchar NOT NULL, "subject" varchar, "payload" text, "channel" varchar CHECK( "channel" IN ('email','sms') ) NOT NULL DEFAULT ('email'), "status" varchar(20) NOT NULL DEFAULT ('queued'), "error_message" text, "retry_count" integer NOT NULL DEFAULT (0), "resend_count" integer NOT NULL DEFAULT (0), "sent_at" datetime, "last_error_at" datetime, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "temporary_notification_logs"("id", "recipient_email", "subject", "payload", "channel", "status", "error_message", "retry_count", "resend_count", "sent_at", "last_error_at", "created_at", "updated_at") SELECT "id", "recipient_email", "subject", "payload", "channel", "status", "error_message", "retry_count", "resend_count", "sent_at", "last_error_at", "created_at", "updated_at" FROM "notification_logs"`);
        await queryRunner.query(`DROP TABLE "notification_logs"`);
        await queryRunner.query(`ALTER TABLE "temporary_notification_logs" RENAME TO "notification_logs"`);
        await queryRunner.query(`CREATE INDEX "IDX_notification_status_created" ON "notification_logs" ("status", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_notification_recipient" ON "notification_logs" ("recipient_email") `);
        await queryRunner.query(`CREATE INDEX "IDX_notification_status" ON "notification_logs" ("status") `);
        await queryRunner.query(`DROP INDEX "idx_notifications_deleted"`);
        await queryRunner.query(`DROP INDEX "idx_notifications_created"`);
        await queryRunner.query(`DROP INDEX "idx_notifications_user_read"`);
        await queryRunner.query(`CREATE TABLE "temporary_notifications" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer, "title" varchar(255) NOT NULL, "message" text NOT NULL, "type" varchar CHECK( "type" IN ('info','success','warning','error','purchase','sale') ) NOT NULL DEFAULT ('info'), "isRead" boolean NOT NULL DEFAULT (0), "metadata" text, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime DEFAULT (datetime('now')), "deletedAt" datetime)`);
        await queryRunner.query(`INSERT INTO "temporary_notifications"("id", "userId", "title", "message", "type", "isRead", "metadata", "createdAt", "updatedAt", "deletedAt") SELECT "id", "userId", "title", "message", "type", "isRead", "metadata", "createdAt", "updatedAt", "deletedAt" FROM "notifications"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`ALTER TABLE "temporary_notifications" RENAME TO "notifications"`);
        await queryRunner.query(`CREATE INDEX "idx_notifications_deleted" ON "notifications" ("deletedAt") `);
        await queryRunner.query(`CREATE INDEX "idx_notifications_created" ON "notifications" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "idx_notifications_user_read" ON "notifications" ("userId", "isRead") `);
    }

    /**
     * @param {QueryRunner} queryRunner
     */
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "idx_notifications_user_read"`);
        await queryRunner.query(`DROP INDEX "idx_notifications_created"`);
        await queryRunner.query(`DROP INDEX "idx_notifications_deleted"`);
        await queryRunner.query(`ALTER TABLE "notifications" RENAME TO "temporary_notifications"`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer, "title" varchar(255) NOT NULL, "message" text NOT NULL, "type" varchar CHECK( "type" IN ('info','success','warning','error','purchase','sale') ) NOT NULL DEFAULT ('info'), "isRead" boolean NOT NULL DEFAULT (0), "metadata" text, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime DEFAULT (datetime('now')), "deletedAt" datetime)`);
        await queryRunner.query(`INSERT INTO "notifications"("id", "userId", "title", "message", "type", "isRead", "metadata", "createdAt", "updatedAt", "deletedAt") SELECT "id", "userId", "title", "message", "type", "isRead", "metadata", "createdAt", "updatedAt", "deletedAt" FROM "temporary_notifications"`);
        await queryRunner.query(`DROP TABLE "temporary_notifications"`);
        await queryRunner.query(`CREATE INDEX "idx_notifications_user_read" ON "notifications" ("userId", "isRead") `);
        await queryRunner.query(`CREATE INDEX "idx_notifications_created" ON "notifications" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "idx_notifications_deleted" ON "notifications" ("deletedAt") `);
        await queryRunner.query(`DROP INDEX "IDX_notification_status"`);
        await queryRunner.query(`DROP INDEX "IDX_notification_recipient"`);
        await queryRunner.query(`DROP INDEX "IDX_notification_status_created"`);
        await queryRunner.query(`ALTER TABLE "notification_logs" RENAME TO "temporary_notification_logs"`);
        await queryRunner.query(`CREATE TABLE "notification_logs" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "recipient_email" varchar NOT NULL, "subject" varchar, "payload" text, "channel" varchar CHECK( "channel" IN ('email','sms') ) NOT NULL DEFAULT ('email'), "status" varchar(20) NOT NULL DEFAULT ('queued'), "error_message" text, "retry_count" integer NOT NULL DEFAULT (0), "resend_count" integer NOT NULL DEFAULT (0), "sent_at" datetime, "last_error_at" datetime, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "notification_logs"("id", "recipient_email", "subject", "payload", "channel", "status", "error_message", "retry_count", "resend_count", "sent_at", "last_error_at", "created_at", "updated_at") SELECT "id", "recipient_email", "subject", "payload", "channel", "status", "error_message", "retry_count", "resend_count", "sent_at", "last_error_at", "created_at", "updated_at" FROM "temporary_notification_logs"`);
        await queryRunner.query(`DROP TABLE "temporary_notification_logs"`);
        await queryRunner.query(`CREATE INDEX "IDX_notification_status" ON "notification_logs" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_notification_recipient" ON "notification_logs" ("recipient_email") `);
        await queryRunner.query(`CREATE INDEX "IDX_notification_status_created" ON "notification_logs" ("status", "created_at") `);
        await queryRunner.query(`ALTER TABLE "sales" RENAME TO "temporary_sales"`);
        await queryRunner.query(`CREATE TABLE "sales" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "timestamp" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "status" varchar CHECK( "status" IN ('initiated','paid','refunded','voided') ) NOT NULL DEFAULT ('initiated'), "paymentMethod" varchar CHECK( "paymentMethod" IN ('cash','card','wallet') ) NOT NULL DEFAULT ('cash'), "totalAmount" real NOT NULL DEFAULT (0), "usedLoyalty" boolean NOT NULL DEFAULT (0), "loyaltyRedeemed" integer NOT NULL DEFAULT (0), "usedDiscount" boolean NOT NULL DEFAULT (0), "totalDiscount" real NOT NULL DEFAULT (0), "usedVoucher" boolean NOT NULL DEFAULT (0), "voucherCode" text, "pointsEarn" real NOT NULL DEFAULT (0), "notes" text, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime, "customerId" integer, "deletedAt" boolean NOT NULL DEFAULT (0), CONSTRAINT "FK_3a92cf6add00043cef9833db1cd" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "sales"("id", "timestamp", "status", "paymentMethod", "totalAmount", "usedLoyalty", "loyaltyRedeemed", "usedDiscount", "totalDiscount", "usedVoucher", "voucherCode", "pointsEarn", "notes", "createdAt", "updatedAt", "customerId", "deletedAt") SELECT "id", "timestamp", "status", "paymentMethod", "totalAmount", "usedLoyalty", "loyaltyRedeemed", "usedDiscount", "totalDiscount", "usedVoucher", "voucherCode", "pointsEarn", "notes", "createdAt", "updatedAt", "customerId", "deletedAt" FROM "temporary_sales"`);
        await queryRunner.query(`DROP TABLE "temporary_sales"`);
        await queryRunner.query(`ALTER TABLE "loyalty_transactions" RENAME TO "temporary_loyalty_transactions"`);
        await queryRunner.query(`CREATE TABLE "loyalty_transactions" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "transactionType" varchar CHECK( "transactionType" IN ('earn','redeem','refund') ) NOT NULL DEFAULT ('earn'), "pointsChange" integer NOT NULL, "timestamp" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "notes" varchar, "updatedAt" datetime, "customerId" integer, "saleId" integer, CONSTRAINT "FK_05f83aa6296690a91ef26552958" FOREIGN KEY ("saleId") REFERENCES "sales" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_652010695a854dd52f21ceb485f" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "loyalty_transactions"("id", "transactionType", "pointsChange", "timestamp", "notes", "updatedAt", "customerId", "saleId") SELECT "id", "transactionType", "pointsChange", "timestamp", "notes", "updatedAt", "customerId", "saleId" FROM "temporary_loyalty_transactions"`);
        await queryRunner.query(`DROP TABLE "temporary_loyalty_transactions"`);
        await queryRunner.query(`ALTER TABLE "suppliers" RENAME TO "temporary_suppliers"`);
        await queryRunner.query(`CREATE TABLE "suppliers" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "contactInfo" varchar, "email" varchar, "phone" varchar, "address" varchar, "isActive" boolean NOT NULL DEFAULT (1), "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime)`);
        await queryRunner.query(`INSERT INTO "suppliers"("id", "name", "contactInfo", "email", "phone", "address", "isActive", "createdAt", "updatedAt") SELECT "id", "name", "contactInfo", "email", "phone", "address", "isActive", "createdAt", "updatedAt" FROM "temporary_suppliers"`);
        await queryRunner.query(`DROP TABLE "temporary_suppliers"`);
        await queryRunner.query(`ALTER TABLE "purchases" RENAME TO "temporary_purchases"`);
        await queryRunner.query(`CREATE TABLE "purchases" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "referenceNo" varchar NOT NULL, "orderDate" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "status" varchar CHECK( "status" IN ('pending','approved','completed','cancelled') ) NOT NULL DEFAULT ('pending'), "totalAmount" decimal NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime, "supplierId" integer, CONSTRAINT "FK_77980c752fdeb3689e318fde424" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "purchases"("id", "referenceNo", "orderDate", "status", "totalAmount", "createdAt", "updatedAt", "supplierId") SELECT "id", "referenceNo", "orderDate", "status", "totalAmount", "createdAt", "updatedAt", "supplierId" FROM "temporary_purchases"`);
        await queryRunner.query(`DROP TABLE "temporary_purchases"`);
        await queryRunner.query(`ALTER TABLE "categories" RENAME TO "temporary_categories"`);
        await queryRunner.query(`CREATE TABLE "categories" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "description" varchar, "isActive" boolean NOT NULL DEFAULT (1), "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime)`);
        await queryRunner.query(`INSERT INTO "categories"("id", "name", "description", "isActive", "createdAt", "updatedAt") SELECT "id", "name", "description", "isActive", "createdAt", "updatedAt" FROM "temporary_categories"`);
        await queryRunner.query(`DROP TABLE "temporary_categories"`);
    }
}
