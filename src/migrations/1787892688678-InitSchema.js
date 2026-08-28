/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

/**
 * @class
 * @implements {MigrationInterface}
 */
module.exports = class InitSchema1787892688678 {
    name = 'InitSchema1787892688678'

    /**
     * @param {QueryRunner} queryRunner
     */
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "temporary_sale_items" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "weightKg" decimal(10,3) NOT NULL DEFAULT (0), "unitPrice" decimal(10,2) NOT NULL DEFAULT (0), "discount" decimal(10,2) NOT NULL DEFAULT (0), "tax" decimal(10,2) NOT NULL DEFAULT (0), "lineTotal" decimal(10,2) NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime, "saleId" integer, "meatId" integer, "batchId" integer NOT NULL, CONSTRAINT "FK_7f21f37dcabd974387830fa07a3" FOREIGN KEY ("batchId") REFERENCES "batches" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_6ba083f68cbeb2b30279707741e" FOREIGN KEY ("meatId") REFERENCES "meats" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_c642be08de5235317d4cf3deb40" FOREIGN KEY ("saleId") REFERENCES "sales" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_sale_items"("id", "weightKg", "unitPrice", "discount", "tax", "lineTotal", "createdAt", "updatedAt", "saleId", "meatId", "batchId") SELECT "id", "weightKg", "unitPrice", "discount", "tax", "lineTotal", "createdAt", "updatedAt", "saleId", "meatId", "batchId" FROM "sale_items"`);
        await queryRunner.query(`DROP TABLE "sale_items"`);
        await queryRunner.query(`ALTER TABLE "temporary_sale_items" RENAME TO "sale_items"`);
        await queryRunner.query(`CREATE TABLE "temporary_sales" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "timestamp" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "status" varchar CHECK( "status" IN ('initiated','paid','refunded','voided') ) NOT NULL DEFAULT ('initiated'), "paymentMethod" varchar CHECK( "paymentMethod" IN ('cash','card','wallet') ) NOT NULL DEFAULT ('cash'), "totalAmount" real NOT NULL DEFAULT (0), "usedLoyalty" boolean NOT NULL DEFAULT (0), "loyaltyRedeemed" integer NOT NULL DEFAULT (0), "usedDiscount" boolean NOT NULL DEFAULT (0), "totalDiscount" real NOT NULL DEFAULT (0), "usedVoucher" boolean NOT NULL DEFAULT (0), "voucherCode" text, "pointsEarn" real NOT NULL DEFAULT (0), "notes" text, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime, "customerId" integer, "deletedAt" datetime, CONSTRAINT "FK_3a92cf6add00043cef9833db1cd" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_sales"("id", "timestamp", "status", "paymentMethod", "totalAmount", "usedLoyalty", "loyaltyRedeemed", "usedDiscount", "totalDiscount", "usedVoucher", "voucherCode", "pointsEarn", "notes", "createdAt", "updatedAt", "customerId", "deletedAt") SELECT "id", "timestamp", "status", "paymentMethod", "totalAmount", "usedLoyalty", "loyaltyRedeemed", "usedDiscount", "totalDiscount", "usedVoucher", "voucherCode", "pointsEarn", "notes", "createdAt", "updatedAt", "customerId", "deletedAt" FROM "sales"`);
        await queryRunner.query(`DROP TABLE "sales"`);
        await queryRunner.query(`ALTER TABLE "temporary_sales" RENAME TO "sales"`);
        await queryRunner.query(`CREATE TABLE "temporary_sale_items" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "weightKg" decimal(10,3) NOT NULL DEFAULT (0), "unitPrice" decimal(10,2) NOT NULL DEFAULT (0), "discount" decimal(10,2) NOT NULL DEFAULT (0), "tax" decimal(10,2) NOT NULL DEFAULT (0), "lineTotal" decimal(10,2) NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime, "saleId" integer, "meatId" integer, "batchId" integer NOT NULL)`);
        await queryRunner.query(`INSERT INTO "temporary_sale_items"("id", "weightKg", "unitPrice", "discount", "tax", "lineTotal", "createdAt", "updatedAt", "saleId", "meatId", "batchId") SELECT "id", "weightKg", "unitPrice", "discount", "tax", "lineTotal", "createdAt", "updatedAt", "saleId", "meatId", "batchId" FROM "sale_items"`);
        await queryRunner.query(`DROP TABLE "sale_items"`);
        await queryRunner.query(`ALTER TABLE "temporary_sale_items" RENAME TO "sale_items"`);
        await queryRunner.query(`CREATE TABLE "temporary_sale_items" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "weightKg" decimal(10,3) NOT NULL DEFAULT (0), "unitPrice" decimal(10,2) NOT NULL DEFAULT (0), "discount" decimal(10,2) NOT NULL DEFAULT (0), "tax" decimal(10,2) NOT NULL DEFAULT (0), "lineTotal" decimal(10,2) NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime, "saleId" integer, "meatId" integer, "batchId" integer)`);
        await queryRunner.query(`INSERT INTO "temporary_sale_items"("id", "weightKg", "unitPrice", "discount", "tax", "lineTotal", "createdAt", "updatedAt", "saleId", "meatId", "batchId") SELECT "id", "weightKg", "unitPrice", "discount", "tax", "lineTotal", "createdAt", "updatedAt", "saleId", "meatId", "batchId" FROM "sale_items"`);
        await queryRunner.query(`DROP TABLE "sale_items"`);
        await queryRunner.query(`ALTER TABLE "temporary_sale_items" RENAME TO "sale_items"`);
        await queryRunner.query(`DROP INDEX "IDX_notification_status"`);
        await queryRunner.query(`DROP INDEX "IDX_notification_recipient"`);
        await queryRunner.query(`DROP INDEX "IDX_notification_status_created"`);
        await queryRunner.query(`CREATE TABLE "temporary_notification_logs" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "recipient_email" varchar NOT NULL, "subject" varchar, "payload" text, "channel" varchar CHECK( "channel" IN ('email','sms') ) NOT NULL DEFAULT ('email'), "status" varchar(20) NOT NULL DEFAULT ('queued'), "error_message" text, "retry_count" integer NOT NULL DEFAULT (0), "resend_count" integer NOT NULL DEFAULT (0), "sent_at" datetime, "last_error_at" datetime, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "temporary_notification_logs"("id", "recipient_email", "subject", "payload", "channel", "status", "error_message", "retry_count", "resend_count", "sent_at", "last_error_at", "created_at", "updated_at") SELECT "id", "recipient_email", "subject", "payload", "channel", "status", "error_message", "retry_count", "resend_count", "sent_at", "last_error_at", "created_at", "updated_at" FROM "notification_logs"`);
        await queryRunner.query(`DROP TABLE "notification_logs"`);
        await queryRunner.query(`ALTER TABLE "temporary_notification_logs" RENAME TO "notification_logs"`);
        await queryRunner.query(`CREATE INDEX "IDX_notification_status" ON "notification_logs" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_notification_recipient" ON "notification_logs" ("recipient_email") `);
        await queryRunner.query(`CREATE INDEX "IDX_notification_status_created" ON "notification_logs" ("status", "created_at") `);
        await queryRunner.query(`DROP INDEX "idx_notifications_user_read"`);
        await queryRunner.query(`DROP INDEX "idx_notifications_created"`);
        await queryRunner.query(`DROP INDEX "idx_notifications_deleted"`);
        await queryRunner.query(`CREATE TABLE "temporary_notifications" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer, "title" varchar(255) NOT NULL, "message" text NOT NULL, "type" varchar CHECK( "type" IN ('info','success','warning','error','purchase','sale') ) NOT NULL DEFAULT ('info'), "isRead" boolean NOT NULL DEFAULT (0), "metadata" text, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime DEFAULT (datetime('now')), "deletedAt" datetime)`);
        await queryRunner.query(`INSERT INTO "temporary_notifications"("id", "userId", "title", "message", "type", "isRead", "metadata", "createdAt", "updatedAt", "deletedAt") SELECT "id", "userId", "title", "message", "type", "isRead", "metadata", "createdAt", "updatedAt", "deletedAt" FROM "notifications"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`ALTER TABLE "temporary_notifications" RENAME TO "notifications"`);
        await queryRunner.query(`CREATE INDEX "idx_notifications_user_read" ON "notifications" ("userId", "isRead") `);
        await queryRunner.query(`CREATE INDEX "idx_notifications_created" ON "notifications" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "idx_notifications_deleted" ON "notifications" ("deletedAt") `);
        await queryRunner.query(`CREATE TABLE "temporary_sale_items" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "weightKg" decimal(10,3) NOT NULL DEFAULT (0), "unitPrice" decimal(10,2) NOT NULL DEFAULT (0), "discount" decimal(10,2) NOT NULL DEFAULT (0), "tax" decimal(10,2) NOT NULL DEFAULT (0), "lineTotal" decimal(10,2) NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime, "saleId" integer, "meatId" integer, "batchId" integer, CONSTRAINT "FK_c642be08de5235317d4cf3deb40" FOREIGN KEY ("saleId") REFERENCES "sales" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_6ba083f68cbeb2b30279707741e" FOREIGN KEY ("meatId") REFERENCES "meats" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_7f21f37dcabd974387830fa07a3" FOREIGN KEY ("batchId") REFERENCES "batches" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_sale_items"("id", "weightKg", "unitPrice", "discount", "tax", "lineTotal", "createdAt", "updatedAt", "saleId", "meatId", "batchId") SELECT "id", "weightKg", "unitPrice", "discount", "tax", "lineTotal", "createdAt", "updatedAt", "saleId", "meatId", "batchId" FROM "sale_items"`);
        await queryRunner.query(`DROP TABLE "sale_items"`);
        await queryRunner.query(`ALTER TABLE "temporary_sale_items" RENAME TO "sale_items"`);
    }

    /**
     * @param {QueryRunner} queryRunner
     */
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "sale_items" RENAME TO "temporary_sale_items"`);
        await queryRunner.query(`CREATE TABLE "sale_items" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "weightKg" decimal(10,3) NOT NULL DEFAULT (0), "unitPrice" decimal(10,2) NOT NULL DEFAULT (0), "discount" decimal(10,2) NOT NULL DEFAULT (0), "tax" decimal(10,2) NOT NULL DEFAULT (0), "lineTotal" decimal(10,2) NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime, "saleId" integer, "meatId" integer, "batchId" integer)`);
        await queryRunner.query(`INSERT INTO "sale_items"("id", "weightKg", "unitPrice", "discount", "tax", "lineTotal", "createdAt", "updatedAt", "saleId", "meatId", "batchId") SELECT "id", "weightKg", "unitPrice", "discount", "tax", "lineTotal", "createdAt", "updatedAt", "saleId", "meatId", "batchId" FROM "temporary_sale_items"`);
        await queryRunner.query(`DROP TABLE "temporary_sale_items"`);
        await queryRunner.query(`DROP INDEX "idx_notifications_deleted"`);
        await queryRunner.query(`DROP INDEX "idx_notifications_created"`);
        await queryRunner.query(`DROP INDEX "idx_notifications_user_read"`);
        await queryRunner.query(`ALTER TABLE "notifications" RENAME TO "temporary_notifications"`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer, "title" varchar(255) NOT NULL, "message" text NOT NULL, "type" varchar CHECK( "type" IN ('info','success','warning','error','purchase','sale') ) NOT NULL DEFAULT ('info'), "isRead" boolean NOT NULL DEFAULT (0), "metadata" text, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime DEFAULT (datetime('now')), "deletedAt" datetime)`);
        await queryRunner.query(`INSERT INTO "notifications"("id", "userId", "title", "message", "type", "isRead", "metadata", "createdAt", "updatedAt", "deletedAt") SELECT "id", "userId", "title", "message", "type", "isRead", "metadata", "createdAt", "updatedAt", "deletedAt" FROM "temporary_notifications"`);
        await queryRunner.query(`DROP TABLE "temporary_notifications"`);
        await queryRunner.query(`CREATE INDEX "idx_notifications_deleted" ON "notifications" ("deletedAt") `);
        await queryRunner.query(`CREATE INDEX "idx_notifications_created" ON "notifications" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "idx_notifications_user_read" ON "notifications" ("userId", "isRead") `);
        await queryRunner.query(`DROP INDEX "IDX_notification_status_created"`);
        await queryRunner.query(`DROP INDEX "IDX_notification_recipient"`);
        await queryRunner.query(`DROP INDEX "IDX_notification_status"`);
        await queryRunner.query(`ALTER TABLE "notification_logs" RENAME TO "temporary_notification_logs"`);
        await queryRunner.query(`CREATE TABLE "notification_logs" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "recipient_email" varchar NOT NULL, "subject" varchar, "payload" text, "channel" varchar CHECK( "channel" IN ('email','sms') ) NOT NULL DEFAULT ('email'), "status" varchar(20) NOT NULL DEFAULT ('queued'), "error_message" text, "retry_count" integer NOT NULL DEFAULT (0), "resend_count" integer NOT NULL DEFAULT (0), "sent_at" datetime, "last_error_at" datetime, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "notification_logs"("id", "recipient_email", "subject", "payload", "channel", "status", "error_message", "retry_count", "resend_count", "sent_at", "last_error_at", "created_at", "updated_at") SELECT "id", "recipient_email", "subject", "payload", "channel", "status", "error_message", "retry_count", "resend_count", "sent_at", "last_error_at", "created_at", "updated_at" FROM "temporary_notification_logs"`);
        await queryRunner.query(`DROP TABLE "temporary_notification_logs"`);
        await queryRunner.query(`CREATE INDEX "IDX_notification_status_created" ON "notification_logs" ("status", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_notification_recipient" ON "notification_logs" ("recipient_email") `);
        await queryRunner.query(`CREATE INDEX "IDX_notification_status" ON "notification_logs" ("status") `);
        await queryRunner.query(`ALTER TABLE "sale_items" RENAME TO "temporary_sale_items"`);
        await queryRunner.query(`CREATE TABLE "sale_items" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "weightKg" decimal(10,3) NOT NULL DEFAULT (0), "unitPrice" decimal(10,2) NOT NULL DEFAULT (0), "discount" decimal(10,2) NOT NULL DEFAULT (0), "tax" decimal(10,2) NOT NULL DEFAULT (0), "lineTotal" decimal(10,2) NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime, "saleId" integer, "meatId" integer, "batchId" integer NOT NULL)`);
        await queryRunner.query(`INSERT INTO "sale_items"("id", "weightKg", "unitPrice", "discount", "tax", "lineTotal", "createdAt", "updatedAt", "saleId", "meatId", "batchId") SELECT "id", "weightKg", "unitPrice", "discount", "tax", "lineTotal", "createdAt", "updatedAt", "saleId", "meatId", "batchId" FROM "temporary_sale_items"`);
        await queryRunner.query(`DROP TABLE "temporary_sale_items"`);
        await queryRunner.query(`ALTER TABLE "sale_items" RENAME TO "temporary_sale_items"`);
        await queryRunner.query(`CREATE TABLE "sale_items" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "weightKg" decimal(10,3) NOT NULL DEFAULT (0), "unitPrice" decimal(10,2) NOT NULL DEFAULT (0), "discount" decimal(10,2) NOT NULL DEFAULT (0), "tax" decimal(10,2) NOT NULL DEFAULT (0), "lineTotal" decimal(10,2) NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime, "saleId" integer, "meatId" integer, "batchId" integer NOT NULL, CONSTRAINT "FK_7f21f37dcabd974387830fa07a3" FOREIGN KEY ("batchId") REFERENCES "batches" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "sale_items"("id", "weightKg", "unitPrice", "discount", "tax", "lineTotal", "createdAt", "updatedAt", "saleId", "meatId", "batchId") SELECT "id", "weightKg", "unitPrice", "discount", "tax", "lineTotal", "createdAt", "updatedAt", "saleId", "meatId", "batchId" FROM "temporary_sale_items"`);
        await queryRunner.query(`DROP TABLE "temporary_sale_items"`);
        await queryRunner.query(`ALTER TABLE "sales" RENAME TO "temporary_sales"`);
        await queryRunner.query(`CREATE TABLE "sales" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "timestamp" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "status" varchar CHECK( "status" IN ('initiated','paid','refunded','voided') ) NOT NULL DEFAULT ('initiated'), "paymentMethod" varchar CHECK( "paymentMethod" IN ('cash','card','wallet') ) NOT NULL DEFAULT ('cash'), "totalAmount" real NOT NULL DEFAULT (0), "usedLoyalty" boolean NOT NULL DEFAULT (0), "loyaltyRedeemed" integer NOT NULL DEFAULT (0), "usedDiscount" boolean NOT NULL DEFAULT (0), "totalDiscount" real NOT NULL DEFAULT (0), "usedVoucher" boolean NOT NULL DEFAULT (0), "voucherCode" text, "pointsEarn" real NOT NULL DEFAULT (0), "notes" text, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime, "customerId" integer, "deletedAt" datetime, CONSTRAINT "FK_3a92cf6add00043cef9833db1cd" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "sales"("id", "timestamp", "status", "paymentMethod", "totalAmount", "usedLoyalty", "loyaltyRedeemed", "usedDiscount", "totalDiscount", "usedVoucher", "voucherCode", "pointsEarn", "notes", "createdAt", "updatedAt", "customerId", "deletedAt") SELECT "id", "timestamp", "status", "paymentMethod", "totalAmount", "usedLoyalty", "loyaltyRedeemed", "usedDiscount", "totalDiscount", "usedVoucher", "voucherCode", "pointsEarn", "notes", "createdAt", "updatedAt", "customerId", "deletedAt" FROM "temporary_sales"`);
        await queryRunner.query(`DROP TABLE "temporary_sales"`);
        await queryRunner.query(`ALTER TABLE "sale_items" RENAME TO "temporary_sale_items"`);
        await queryRunner.query(`CREATE TABLE "sale_items" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "weightKg" decimal(10,3) NOT NULL DEFAULT (0), "unitPrice" decimal(10,2) NOT NULL DEFAULT (0), "discount" decimal(10,2) NOT NULL DEFAULT (0), "tax" decimal(10,2) NOT NULL DEFAULT (0), "lineTotal" decimal(10,2) NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime, "saleId" integer, "meatId" integer, "batchId" integer NOT NULL, CONSTRAINT "FK_7f21f37dcabd974387830fa07a3" FOREIGN KEY ("batchId") REFERENCES "batches" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_6ba083f68cbeb2b30279707741e" FOREIGN KEY ("meatId") REFERENCES "meats" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_c642be08de5235317d4cf3deb40" FOREIGN KEY ("saleId") REFERENCES "sales" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "sale_items"("id", "weightKg", "unitPrice", "discount", "tax", "lineTotal", "createdAt", "updatedAt", "saleId", "meatId", "batchId") SELECT "id", "weightKg", "unitPrice", "discount", "tax", "lineTotal", "createdAt", "updatedAt", "saleId", "meatId", "batchId" FROM "temporary_sale_items"`);
        await queryRunner.query(`DROP TABLE "temporary_sale_items"`);
    }
}
