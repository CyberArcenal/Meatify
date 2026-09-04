# 🥩 Meatify - Complete TODO List of All Issues

## 📋 Priority Legend
- 🔴 **CRITICAL** - Security, data integrity, production-blocking
- 🟠 **HIGH** - Performance, maintainability, potential bugs
- 🟡 **MEDIUM** - Code quality, duplication, improvements
- 🟢 **LOW** - Nice-to-have, documentation, minor enhancements

---

## 🔴 CRITICAL ISSUES (Fix Immediately)

### 1. Race Conditions in Batch Deduction
- **File:** `src/services/Batch.js`
- **Method:** `deductFromBatch()`, `fifoDeduct()`
- **Issue:** Multiple concurrent requests can deduct from same batch, causing negative stock
- **Fix:** Implement optimistic locking with version column
- **Time:** 4 hours

### 2. Missing Input Validation in Services
- **Files:** All service files
- **Issue:** No validation for customer existence, email format, expiry dates
- **Fix:** Add Joi/Zod validation schemas for all service inputs
- **Time:** 8 hours

### 3. N+1 Query Problem in SaleService
- **File:** `src/services/Sale.js`
- **Method:** `create()`, `update()`
- **Issue:** Individual queries per item instead of batch loading
- **Fix:** Use `findByIds()` or JOIN queries
- **Time:** 3 hours

### 4. Circular Dependencies
- **Files:** `BatchService.js` ↔ `SaleService.js`
- **Issue:** Services importing each other creates circular dependencies
- **Fix:** Use ServiceRegistry or event-driven pattern
- **Time:** 4 hours

### 5. No Transaction Rollback on Errors
- **Files:** All services with complex operations
- **Issue:** Multi-step operations don't rollback on failure
- **Fix:** Proper try/catch with explicit rollback
- **Time:** 6 hours

### 6. Environment Loading Race Condition
- **File:** `src/main/index.js`
- **Issue:** `loadEnv()` called before app is ready
- **Fix:** Move inside `app.whenReady()`
- **Time:** 1 hour

### 7. Schedulers Don't Check Database Readiness
- **Files:** All scheduler files
- **Issue:** Schedulers run before DB is ready
- **Fix:** Add `AppDataSource.isInitialized` check
- **Time:** 2 hours

### 8. Duplicate IPC Module Loading
- **File:** `src/main/core/ipc-registry.js`
- **Issue:** `dailySales` appears in multiple arrays
- **Fix:** Use Set to deduplicate paths
- **Time:** 1 hour

### 9. Schedulers Not Stopped on App Shutdown
- **File:** `src/main/index.js`
- **Issue:** Schedulers continue running after app closes
- **Fix:** Store references and call `stop()` on shutdown
- **Time:** 2 hours

### 10. Hardcoded User ID in Notifications
- **Files:** All scheduler files, `Notification.js`
- **Issue:** `userId: 1` hardcoded everywhere
- **Fix:** Get system user ID from settings
- **Time:** 2 hours

---

## 🟠 HIGH PRIORITY ISSUES

### 11. Performance Issues - Missing Database Indexes
- **Files:** All entities
- **Issue:** Frequently queried columns lack indexes
- **Fix:** Create migration with indexes
- **Time:** 2 hours

### 12. Code Duplication - BaseService Missing
- **Files:** All service files
- **Issue:** Duplicate `_getRepo()`, `_isAuditEnabled()`, bulk operations
- **Fix:** Create BaseService class
- **Time:** 8 hours

### 13. StateService Too Large
- **File:** `src/stateServices/SaleStateService.js`
- **Issue:** `onPaid()` handles too many responsibilities
- **Fix:** Split into smaller focused handlers
- **Time:** 4 hours

### 14. Inconsistent Error Handling
- **Files:** All services
- **Issue:** Mix of `console.error`, `logger.error`, raw throws
- **Fix:** Create centralized error handling
- **Time:** 3 hours

### 15. No Idempotency for Sale Processing
- **File:** `src/stateServices/SaleStateService.js`
- **Method:** `onPaid()`
- **Issue:** Multiple calls double-deduct stock
- **Fix:** Add `processedAt` check
- **Time:** 2 hours

### 16. No Error Recovery for Schedulers
- **Files:** All schedulers
- **Issue:** Failed cleanups don't retry
- **Fix:** Implement retry with exponential backoff
- **Time:** 4 hours

### 17. Performance: Multiple Queries in Schedulers
- **File:** `src/scheduler/LowStockAlertScheduler.js`
- **Issue:** Calls heavy `getStatistics()` when only need low stock
- **Fix:** Create dedicated `getLowStockBatches()` method
- **Time:** 2 hours

### 18. Scheduler Startup Delay Hardcoded
- **File:** `src/scheduler/auditTrailCleanupScheduler.js`
- **Issue:** 10 second delay hardcoded
- **Fix:** Make configurable via system settings
- **Time:** 1 hour

### 19. No Rate Limiting for Notifications
- **File:** `src/scheduler/LowStockAlertScheduler.js`
- **Issue:** Repeated notifications for same item
- **Fix:** Implement cooldown per batch
- **Time:** 3 hours

### 20. Missing Database Backup Verification
- **File:** `src/scheduler/DatabaseBackupScheduler.js`
- **Issue:** Backup created but not verified
- **Fix:** Add integrity check after backup
- **Time:** 2 hours

---

## 🟡 MEDIUM PRIORITY ISSUES

### 21. Hardcoded Values Everywhere
- **Files:** Multiple services
- **Issue:** User IDs, thresholds hardcoded
- **Fix:** Use system settings or context
- **Time:** 3 hours

### 22. Missing Bulk Operations in Some Services
- **Files:** `ReturnRefundItemService`, `PurchaseItemService`, `SaleItemService`
- **Issue:** Lack `bulkCreate` and `bulkUpdate`
- **Fix:** Add bulk operations (inherit from BaseService)
- **Time:** 2 hours

### 23. Export/Import Methods Inconsistent
- **Files:** All services with export/import
- **Issue:** Each implements differently
- **Fix:** Standardize with BaseService
- **Time:** 3 hours

### 24. Notification Service Not Used Everywhere
- **Files:** Services that should send notifications
- **Issue:** Missing notifications for supplier deactivation, category merge
- **Fix:** Add notifications to all state services
- **Time:** 4 hours

### 25. Duplicate Type Definitions
- **Files:** Multiple services
- **Issue:** Same JSDoc types repeated
- **Fix:** Create shared type definitions
- **Time:** 2 hours

### 26. Missing Soft Delete in Some Entities
- **Files:** `SystemSetting`, `NotificationLog`
- **Issue:** Lack `deletedAt` or `isDeleted`
- **Fix:** Add soft delete columns
- **Time:** 3 hours

### 27. Logger Usage Inconsistent
- **Files:** All files
- **Issue:** Mix of `logger` and `console`
- **Fix:** Use logger everywhere, add lint rule
- **Time:** 2 hours

### 28. Magic Strings in Status Checks
- **Files:** Multiple services
- **Issue:** Hardcoded status strings
- **Fix:** Create constants file
- **Time:** 3 hours

### 29. Missing Retry Logic for External Services
- **Files:** `Printer.js`, `CashDrawer.js`
- **Issue:** Failed operations don't retry
- **Fix:** Implement retry with exponential backoff
- **Time:** 4 hours

### 30. No Data Validation in Import Methods
- **Files:** All `importFromCSV` methods
- **Issue:** CSV imports trust data without validation
- **Fix:** Add schema validation for imports
- **Time:** 4 hours

### 31. Daily Sales Report - Timezone Issues
- **File:** `src/scheduler/DailySalesReportScheduler.js`
- **Issue:** Uses local timezone instead of configured
- **Fix:** Use system timezone setting
- **Time:** 1 hour

### 32. Schedulers Not Respecting Maintenance Windows
- **Files:** All schedulers
- **Issue:** Run regardless of business hours
- **Fix:** Add maintenance window configuration
- **Time:** 3 hours

### 33. Missing Log Rotation for Scheduler Logs
- **File:** `src/main/core/logger.js`
- **Issue:** Logs grow indefinitely
- **Fix:** Configure log rotation
- **Time:** 1 hour

### 34. Service Container - No Initialization Order
- **File:** `src/main/core/service-container.js`
- **Issue:** Services might initialize in wrong order
- **Fix:** Implement topological sort
- **Time:** 4 hours

### 35. Preload.js - Exposes Too Much
- **File:** `src/preload.js`
- **Issue:** All services exposed to renderer
- **Fix:** Use whitelist approach
- **Time:** 2 hours

---

## 🟢 LOW PRIORITY ISSUES

### 36. Missing Unit Tests
- **Files:** No test files
- **Issue:** No test coverage
- **Fix:** Set up Jest/Mocha, write tests
- **Time:** 20 hours

### 37. Inconsistent Naming Conventions
- **Files:** Multiple
- **Issue:** Mix of camelCase, snake_case
- **Fix:** Standardize naming
- **Time:** 4 hours

### 38. Missing API Documentation
- **Files:** Services
- **Issue:** No comprehensive API docs
- **Fix:** Add JSDoc comments to all public methods
- **Time:** 8 hours

### 39. No Connection Pool Monitoring
- **File:** `src/main/db/data-source.js`
- **Issue:** No monitoring of DB connection pool
- **Fix:** Add health checks
- **Time:** 2 hours

### 40. Missing Environment Validation
- **File:** `src/main/core/env.js`
- **Issue:** No validation of required env vars
- **Fix:** Add env validation on startup
- **Time:** 1 hour

### 41. Missing Graceful Shutdown
- **File:** `src/main/index.js`
- **Issue:** App doesn't handle SIGTERM/SIGINT
- **Fix:** Add graceful shutdown handlers
- **Time:** 2 hours

### 42. No CORS/Origin Protection
- **Files:** IPC handlers
- **Issue:** No origin validation
- **Fix:** Implement origin validation
- **Time:** 2 hours

### 43. Missing Log Rotation
- **File:** Logger configuration
- **Issue:** Log files can grow indefinitely
- **Fix:** Configure DailyRotateFile transport
- **Time:** 1 hour

### 44. No Performance Metrics
- **Files:** Services
- **Issue:** No timing/performance tracking
- **Fix:** Add performance logging
- **Time:** 2 hours

### 45. Missing Health Check Endpoint
- **Files:** Main process
- **Issue:** No way to check app health
- **Fix:** Add health endpoint
- **Time:** 2 hours

### 46. No Metrics/Monitoring for Schedulers
- **Files:** All schedulers
- **Issue:** No way to track scheduler performance
- **Fix:** Add SchedulerMetrics class
- **Time:** 3 hours

### 47. No Scheduler Pause/Resume Capability
- **Files:** All schedulers
- **Issue:** Can only start or stop
- **Fix:** Add pause/resume methods
- **Time:** 2 hours

### 48. Database Backup Path Not Validated
- **File:** `src/scheduler/DatabaseBackupScheduler.js`
- **Issue:** Backup path might not exist or be writable
- **Fix:** Validate and create directory
- **Time:** 1 hour

### 49. Missing Scheduler Health Check
- **Files:** All schedulers
- **Issue:** No way to check if schedulers are running correctly
- **Fix:** Add health check endpoint
- **Time:** 2 hours

### 50. No Test Mode for Schedulers
- **Files:** All schedulers
- **Issue:** Can't test without waiting for intervals
- **Fix:** Add test mode with shorter intervals
- **Time:** 2 hours

---

## 📊 Summary Statistics

| Priority | Count | Estimated Hours | Category |
|----------|-------|-----------------|----------|
| 🔴 CRITICAL | 10 | 33 hours | Security, Data Integrity, Production |
| 🟠 HIGH | 10 | 31 hours | Performance, Maintainability |
| 🟡 MEDIUM | 15 | 42 hours | Code Quality, Improvements |
| 🟢 LOW | 15 | 54 hours | Nice-to-Have, Documentation |
| **TOTAL** | **50** | **160 hours** | **All Categories** |

---

## 📂 Issues by Module

### Overall System (10 issues)
- 🔴 #1, #2, #3, #4, #5
- 🟡 #21, #22, #25, #26
- 🟢 #36

### Schedulers (15 issues)
- 🔴 #7, #9, #10
- 🟠 #16, #17, #18, #19, #20
- 🟡 #31, #32
- 🟢 #46, #47, #48, #49, #50

### Core Infrastructure (13 issues)
- 🔴 #6, #8
- 🟠 #11, #12, #14
- 🟡 #27, #29, #30, #33, #34, #35
- 🟢 #39, #40

### State Services (5 issues)
- 🟠 #13, #15
- 🟡 #24, #28

### Service Layer (7 issues)
- 🔴 #1, #3
- 🟡 #23
- 🟢 #37, #38, #41, #45

---

## 🚀 Weekly Work Plan

### Week 1: Critical Fixes
| Day | Issue | Hours |
|-----|-------|-------|
| Mon | #6 Environment loading race condition | 1 |
| Mon | #8 Duplicate IPC modules | 1 |
| Tue | #7 Database readiness checks | 2 |
| Tue | #9 Scheduler shutdown cleanup | 2 |
| Wed | #1 Optimistic locking for batches | 4 |
| Thu | #2 Input validation schemas | 4 |
| Fri | #10 Replace hardcoded user IDs | 2 |
| Fri | #5 Transaction rollback | 2 |

### Week 2: High Priority
| Day | Issue | Hours |
|-----|-------|-------|
| Mon | #11 Database indexes | 2 |
| Mon | #3 N+1 query fix | 3 |
| Tue | #4 Circular dependencies | 4 |
| Wed | #12 BaseService implementation | 4 |
| Thu | #12 BaseService (continued) | 4 |
| Fri | #16 Scheduler retry logic | 4 |
| Fri | #19 Rate limiting notifications | 2 |

### Week 3: Medium Priority
| Day | Issue | Hours |
|-----|-------|-------|
| Mon | #18 Configurable scheduler delay | 1 |
| Mon | #13 Split SaleStateService | 4 |
| Tue | #14 Error handling standardization | 3 |
| Wed | #15 Idempotency for sales | 2 |
| Wed | #17 Optimize low stock queries | 2 |
| Thu | #20 Backup verification | 2 |
| Thu | #21 Remove hardcoded values | 3 |
| Fri | #22 Add bulk operations | 2 |

### Week 4: Remaining Issues
| Day | Issue | Hours |
|-----|-------|-------|
| Mon | #23-25 Standardize exports/types | 7 |
| Tue | #26-30 Soft delete, logger, constants, retry, validation | 14 |
| Wed | #31-35 Timezone, maintenance, rotation, container, preload | 11 |
| Thu | #36-38 Tests, naming, docs | 32 |
| Fri | #39-50 Remaining low priority | 22 |

---

## 📝 Implementation Notes

### BaseService Implementation (Issue #12)
```javascript
// Priority: High - Needed for many other fixes
class BaseService {
  constructor(entityClass, options = {}) {
    this.entityClass = entityClass;
    this.ALLOWED_SORT_COLUMNS = options.allowedSortColumns || new Set(['id', 'createdAt', 'updatedAt']);
  }
  
  _getRepo(qr, entityClass = null) { /* common logic */ }
  async _isAuditEnabled(qr = null) { /* common logic */ }
  async findById(id, includeDeleted = false, qr = null) { /* common logic */ }
  async findAll(options = {}, qr = null) { /* common pagination */ }
  async bulkCreate(dataArray, user = 'system', qr = null) { /* common logic */ }
  async bulkUpdate(updatesArray, user = 'system', qr = null) { /* common logic */ }
  async export(format = 'json', filters = {}, user = 'system', qr = null) { /* common logic */ }
  async importFromCSV(filePath, user = 'system', qr = null) { /* common logic */ }
}
```

### Scheduler Base Class (Issues #16, #17, #18, #20, #32, #46, #47)
```javascript
// Priority: Medium - Consolidates all scheduler improvements
class SchedulerBase {
  constructor(options = {}) {
    this.name = options.name || this.constructor.name;
    this.interval = options.interval || 3600000;
    this.enabled = options.enabled !== false;
    this.paused = false;
    this.running = false;
    this.metrics = new SchedulerMetrics(this.name);
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 5000;
    this.intervalId = null;
    this.maintenanceWindow = options.maintenanceWindow || null;
  }
  
  async start() { /* implementation */ }
  async runWithRetry(attempt = 1) { /* implementation */ }
  async execute() { /* override in child */ }
  async stop() { /* implementation */ }
  pause() { this.paused = true; }
  resume() { this.paused = false; }
  getStatus() { /* implementation */ }
}
```

---

## ✅ Progress Tracking

### Completed Tasks
- [ ] None yet

### In Progress
- [ ] BaseService implementation
- [ ] Optimistic locking for batches

### Next Up
1. Fix environment loading race condition
2. Add database readiness checks
3. Fix duplicate IPC modules
4. Implement scheduler shutdown cleanup

---

*Last Updated: 2026-09-04*
*Project: Meatify POS System*
*Total Issues: 50*
*Estimated Total Time: 160 hours*