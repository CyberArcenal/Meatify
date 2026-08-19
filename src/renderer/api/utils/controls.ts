// src/renderer/api/utils/controls.ts

export interface TaskTriggerResponse {
  taskId: string;
  status: "queued";
}

export interface TaskStatusResponse {
  enabled: boolean;
  lastRun: {
    date?: string;
    timestamp?: string;
    processed?: number;
    errors?: number;
    // etc.
  } | null;
  isRunning: boolean;
  schedule: string | null;
}

export interface HealthCheckResponse {
  issuesFound: number;
  issues: Array<{
    type: string;
    debtId?: number;
    debtName?: string;
    message: string;
    [key: string]: any;
  }>;
}

// Response wrapper from server
interface ApiResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

class ControlsAPI {
  private async request<T>(method: string, params?: any): Promise<T> {
    if (!window.backendAPI?.["window-control"]) {
      throw new Error("Controls API not available");
    }
    const response = await window.backendAPI["window-control"]({
      method,
      params: params || {},
    });
    if (!response.status) {
      throw new Error(response.message || "Controls request failed");
    }
    return response.data as T;
  }

  // ============================================================
  // 📊 INTEREST ACCRUAL
  // ============================================================

  triggerInterestAccrual = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerInterestAccrual");
  };

  getInterestAccrualStatus = async (): Promise<TaskStatusResponse> => {
    return this.request<TaskStatusResponse>("getInterestAccrualStatus");
  };

  // ============================================================
  // 🔄 OVERDUE CORRECTOR
  // ============================================================

  triggerOverdueCorrector = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerOverdueCorrector");
  };

  getOverdueCorrectorStatus = async (): Promise<TaskStatusResponse> => {
    return this.request<TaskStatusResponse>("getOverdueCorrectorStatus");
  };

  // ============================================================
  // 🔄 OVERDUE UPDATER
  // ============================================================

  triggerOverdueUpdater = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerOverdueUpdater");
  };

  getOverdueUpdaterStatus = async (): Promise<TaskStatusResponse> => {
    return this.request<TaskStatusResponse>("getOverdueUpdaterStatus");
  };

  // ============================================================
  // ⚖️ ZERO BALANCE FIXER
  // ============================================================

  triggerZeroBalanceFixer = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerZeroBalanceFixer");
  };

  getZeroBalanceFixerStatus = async (): Promise<TaskStatusResponse> => {
    return this.request<TaskStatusResponse>("getZeroBalanceFixerStatus");
  };

  // ============================================================
  // 💰 PENALTY SCHEDULER
  // ============================================================

  triggerPenaltyScheduler = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerPenaltyScheduler");
  };

  getPenaltySchedulerStatus = async (): Promise<TaskStatusResponse> => {
    return this.request<TaskStatusResponse>("getPenaltySchedulerStatus");
  };

  // ============================================================
  // 🏥 HEALTH CHECKS
  // ============================================================

  getOverdueStatusHealth = async (): Promise<HealthCheckResponse> => {
    return this.request<HealthCheckResponse>("overdueStatusHealth");
  };

  getZeroBalanceHealth = async (): Promise<HealthCheckResponse> => {
    return this.request<HealthCheckResponse>("zeroBalanceHealth");
  };

  getPenaltyHealth = async (): Promise<HealthCheckResponse> => {
    return this.request<HealthCheckResponse>("penaltyHealth");
  };

  // ============================================================
  // 🧹 AUDIT CLEANUP
  // ============================================================

  triggerAuditCleanup = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerAuditCleanup");
  };

  getAuditCleanupStatus = async (): Promise<any> => {
    return this.request<any>("getAuditCleanupStatus");
  };

  // ============================================================
  // 🔔 OVERDUE REMINDERS
  // ============================================================

  triggerOverdueReminders = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerOverdueReminders");
  };

  getOverdueRemindersStatus = async (): Promise<TaskStatusResponse> => {
    return this.request<TaskStatusResponse>("getOverdueRemindersStatus");
  };

  // ============================================================
  // 📧 NOTIFICATION RETRY
  // ============================================================

  triggerNotificationRetry = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerNotificationRetry");
  };

  getNotificationRetryStatus = async (): Promise<any> => {
    return this.request<any>("getNotificationRetryStatus");
  };

  // ============================================================
  // 👤 BORROWER TASKS
  // ============================================================

  triggerCreditScoreRecalc = async (borrowerIds?: number[]): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerCreditScoreRecalc", { borrower_ids: borrowerIds });
  };

  triggerBorrowerMerge = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerBorrowerMerge");
  };

  triggerBorrowerCleanup = async (days: number = 30): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerBorrowerCleanup", { days });
  };

  triggerBorrowerStatusUpdate = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerBorrowerStatusUpdate");
  };

  // ============================================================
  // 👥 GROUP TASKS
  // ============================================================

  triggerBulkAssign = async (groupId: number, debtorIds: number[]): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerBulkAssign", { group_id: groupId, debtor_ids: debtorIds });
  };

  triggerAutoAssign = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerAutoAssign");
  };

  triggerGroupCleanup = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerGroupCleanup");
  };

  triggerGroupStatsUpdate = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerGroupStatsUpdate");
  };

  // ============================================================
  // 📄 LOAN AGREEMENT TASKS
  // ============================================================

  triggerAgreementCleanup = async (days: number = 90): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerAgreementCleanup", { days });
  };

  triggerOverdueAgreementNotify = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerOverdueAgreementNotify");
  };

  triggerAutoAssignAgreements = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerAutoAssignAgreements");
  };

  triggerSyncAgreementStatus = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerSyncAgreementStatus");
  };

  // ============================================================
  // 📋 LOAN APPLICATION TASKS
  // ============================================================

  triggerAutoApprove = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerAutoApprove");
  };

  triggerStaleCleanup = async (days: number = 30): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerStaleCleanup", { days });
  };

  triggerPendingReminders = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerPendingReminders");
  };

  triggerBulkImportApplications = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerBulkImportApplications");
  };

  // ============================================================
  // 💳 PAYMENT METHOD TASKS
  // ============================================================

  triggerPaymentMethodStatsRecalc = async (methodIds?: number[]): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerPaymentMethodStatsRecalc", { method_ids: methodIds });
  };

  triggerPaymentMethodCleanup = async (days: number = 180): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerPaymentMethodCleanup", { days });
  };

  triggerPaymentMethodReport = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerPaymentMethodReport");
  };

  triggerEnsureDefaultMethod = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerEnsureDefaultMethod");
  };

  // ============================================================
  // 🔄 SYNC MAINTENANCE TASKS
  // ============================================================

  triggerSyncHealthCheck = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerSyncHealthCheck");
  };

  triggerSyncQueueRetry = async (entity?: string, limit: number = 50): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerSyncQueueRetry", { entity, limit });
  };

  triggerSyncCleanup = async (days: number = 90): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerSyncCleanup", { days });
  };

  triggerSyncReport = async (days: number = 7): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerSyncReport", { days });
  };

  // ============================================================
  // ⚙️ SYSTEM SETTINGS TASKS
  // ============================================================

  triggerSettingsCacheRefresh = async (settingType?: string): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerSettingsCacheRefresh", { setting_type: settingType });
  };

  triggerSettingsValidate = async (settingType?: string): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerSettingsValidate", { setting_type: settingType });
  };

  triggerSettingsBackup = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerSettingsBackup");
  };

  triggerSettingsDiff = async (): Promise<any> => {
    return this.request<any>("triggerSettingsDiff");
  };

  // ============================================================
  // 🔒 USER / SECURITY TASKS
  // ============================================================

  triggerSecurityCleanup = async (days: number = 30): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerSecurityCleanup", { days });
  };

  triggerSecurityMonitor = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerSecurityMonitor");
  };

  triggerAutoSuspend = async (days: number = 90): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerAutoSuspend", { days });
  };

  triggerOrphanCleanup = async (days: number = 30): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerOrphanCleanup", { days });
  };

  triggerSecurityReport = async (): Promise<TaskTriggerResponse> => {
    return this.request<TaskTriggerResponse>("triggerSecurityReport");
  };
}

const controlsAPI = new ControlsAPI();
export default controlsAPI;