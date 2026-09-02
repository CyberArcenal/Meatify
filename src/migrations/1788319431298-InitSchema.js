/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

/**
 * @class
 * @implements {MigrationInterface}
 */
module.exports = class InitSchema1788319431298 {
    name = 'InitSchema1788319431298'

    /**
     * @param {QueryRunner} queryRunner
     */
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "temporary_sales" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "timestamp" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "status" varchar CHECK( "status" IN ('initiated','paid','refunded','voided') ) NOT NULL DEFAULT ('initiated'), "paymentMethod" varchar CHECK( "paymentMethod" IN ('cash','card','wallet') ) NOT NULL DEFAULT ('cash'), "totalAmount" real NOT NULL DEFAULT (0), "usedLoyalty" boolean NOT NULL DEFAULT (0), "loyaltyRedeemed" integer NOT NULL DEFAULT (0), "usedDiscount" boolean NOT NULL DEFAULT (0), "totalDiscount" real NOT NULL DEFAULT (0), "usedVoucher" boolean NOT NULL DEFAULT (0), "voucherCode" text, "pointsEarn" real NOT NULL DEFAULT (0), "notes" text, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime, "deletedAt" datetime, "customerId" integer, CONSTRAINT "FK_3a92cf6add00043cef9833db1cd" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_sales"("id", "timestamp", "status", "paymentMethod", "totalAmount", "usedLoyalty", "loyaltyRedeemed", "usedDiscount", "totalDiscount", "usedVoucher", "voucherCode", "pointsEarn", "notes", "createdAt", "updatedAt", "deletedAt", "customerId") SELECT "id", "timestamp", "status", "paymentMethod", "totalAmount", "usedLoyalty", "loyaltyRedeemed", "usedDiscount", "totalDiscount", "usedVoucher", "voucherCode", "pointsEarn", "notes", "createdAt", "updatedAt", "deletedAt", "customerId" FROM "sales"`);
        await queryRunner.query(`DROP TABLE "sales"`);
        await queryRunner.query(`ALTER TABLE "temporary_sales" RENAME TO "sales"`);
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
    }

    /**
     * @param {QueryRunner} queryRunner
     */
    async down(queryRunner) {
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
        await queryRunner.query(`ALTER TABLE "sales" RENAME TO "temporary_sales"`);
        await queryRunner.query(`CREATE TABLE "sales" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "timestamp" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "status" varchar CHECK( "status" IN ('initiated','paid','refunded','voided') ) NOT NULL DEFAULT ('initiated'), "paymentMethod" varchar CHECK( "paymentMethod" IN ('cash','card','wallet') ) NOT NULL DEFAULT ('cash'), "totalAmount" real NOT NULL DEFAULT (0), "usedLoyalty" boolean NOT NULL DEFAULT (0), "loyaltyRedeemed" integer NOT NULL DEFAULT (0), "usedDiscount" boolean NOT NULL DEFAULT (0), "totalDiscount" real NOT NULL DEFAULT (0), "usedVoucher" boolean NOT NULL DEFAULT (0), "voucherCode" text, "pointsEarn" real NOT NULL DEFAULT (0), "notes" text, "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime, "deletedAt" datetime, "customerId" integer, CONSTRAINT "FK_3a92cf6add00043cef9833db1cd" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "sales"("id", "timestamp", "status", "paymentMethod", "totalAmount", "usedLoyalty", "loyaltyRedeemed", "usedDiscount", "totalDiscount", "usedVoucher", "voucherCode", "pointsEarn", "notes", "createdAt", "updatedAt", "deletedAt", "customerId") SELECT "id", "timestamp", "status", "paymentMethod", "totalAmount", "usedLoyalty", "loyaltyRedeemed", "usedDiscount", "totalDiscount", "usedVoucher", "voucherCode", "pointsEarn", "notes", "createdAt", "updatedAt", "deletedAt", "customerId" FROM "temporary_sales"`);
        await queryRunner.query(`DROP TABLE "temporary_sales"`);
    }
}
