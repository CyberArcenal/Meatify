// src/api/core/notificationLog.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface NotificationLog {
  id: number;
  recipient_email: string;
  subject: string | null;
  channel: 'email' | 'sms';
  payload: string | null;
  status: 'queued' | 'sent' | 'failed' | 'resend';
  error_message: string | null;
  retry_count: number;
  resend_count: number;
  sent_at: string | null;
  last_error_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedLogs {
  pagination: any;
  data: NotificationLog[];
  items: NotificationLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LogStatistics {
  data: LogStatistics;
  total: number;
  byStatus: Record<string, number>;
  avgRetryFailed: number;
  last24h: number;
}

export interface BulkCreateResult {
  created: NotificationLog[];
  errors: Array<{ log: any; error: string }>;
}

export interface BulkUpdateResult {
  updated: NotificationLog[];
  errors: Array<{ id: number; error: string }>;
}

export interface ImportResult {
  imported: NotificationLog[];
  errors: Array<{ row: any; error: string }>;
}

export interface LogExportData {
  format: string;
  data: string | NotificationLog[];
  filename: string;
}

export interface RetryAllResult {
  successCount: number;
  failCount: number;
  results: Array<{ id: number; success: boolean; error?: string }>;
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface LogsResponse {
  status: boolean;
  message: string;
  data: PaginatedLogs;
}

export interface LogResponse {
  status: boolean;
  message: string;
  data: NotificationLog;
}

export interface LogStatisticsResponse {
  status: boolean;
  message: string;
  data: LogStatistics;
}

export interface LogExportResponse {
  status: boolean;
  message: string;
  data: LogExportData;
}

export interface BulkCreateResponse {
  status: boolean;
  message: string;
  data: BulkCreateResult;
}

export interface BulkUpdateResponse {
  status: boolean;
  message: string;
  data: BulkUpdateResult;
}

export interface ImportResponse {
  status: boolean;
  message: string;
  data: ImportResult;
}

export interface RetryResponse {
  status: boolean;
  message: string;
  data: NotificationLog;
}

export interface RetryAllResponse {
  status: boolean;
  message: string;
  data: RetryAllResult;
}

export interface ResendResponse {
  status: boolean;
  message: string;
  data: NotificationLog;
}

// ----------------------------------------------------------------------
// 🧠 NotificationLogAPI Class
// ----------------------------------------------------------------------

class NotificationLogAPI {
  // --------------------------------------------------------------------
  // 🔎 READ-ONLY METHODS
  // --------------------------------------------------------------------

  /**
   * Get all notification logs with pagination and filters
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<LogsResponse> {
    try {
      if (!window.backendAPI?.notificationLog) {
        throw new Error('Electron API (notificationLog) not available');
      }

      const response = await window.backendAPI.notificationLog({
        method: 'getAllLogs',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch notification logs');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch notification logs');
    }
  }

  /**
   * Get a single notification log by ID
   */
  async getById(id: number): Promise<LogResponse> {
    try {
      if (!window.backendAPI?.notificationLog) {
        throw new Error('Electron API (notificationLog) not available');
      }

      const response = await window.backendAPI.notificationLog({
        method: 'getLogById',
        params: { id },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch notification log');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch notification log');
    }
  }

  /**
   * Get logs by recipient email
   */
  async getByRecipient(
    recipientEmail: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<LogsResponse> {
    try {
      if (!window.backendAPI?.notificationLog) {
        throw new Error('Electron API (notificationLog) not available');
      }

      const response = await window.backendAPI.notificationLog({
        method: 'getLogsByRecipient',
        params: { recipientEmail, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch logs by recipient');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch logs by recipient');
    }
  }

  /**
   * Get logs by status
   */
  async getByStatus(
    status: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<LogsResponse> {
    try {
      if (!window.backendAPI?.notificationLog) {
        throw new Error('Electron API (notificationLog) not available');
      }

      const response = await window.backendAPI.notificationLog({
        method: 'getLogsByStatus',
        params: { status, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch logs by status');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch logs by status');
    }
  }

  /**
   * Get notification log statistics
   */
  async getStatistics(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<LogStatisticsResponse> {
    try {
      if (!window.backendAPI?.notificationLog) {
        throw new Error('Electron API (notificationLog) not available');
      }

      const response = await window.backendAPI.notificationLog({
        method: 'getLogStatistics',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch statistics');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch statistics');
    }
  }

  /**
   * Search notification logs with flexible filters
   */
  async search(params: {
    keyword?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<LogsResponse> {
    try {
      if (!window.backendAPI?.notificationLog) {
        throw new Error('Electron API (notificationLog) not available');
      }

      const response = await window.backendAPI.notificationLog({
        method: 'searchLogs',
        params,
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to search logs');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to search logs');
    }
  }

  // --------------------------------------------------------------------
  // ✏️ WRITE OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Create a new notification log (queued)
   */
  async create(data: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<LogResponse> {
    try {
      if (!window.backendAPI?.notificationLog) {
        throw new Error('Electron API (notificationLog) not available');
      }

      const response = await window.backendAPI.notificationLog({
        method: 'createLog',
        params: { ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to create notification log');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create notification log');
    }
  }

  /**
   * Update a notification log status
   */
  async updateStatus(
    id: number,
    status: string,
    errorMessage: string | null = null
  ): Promise<LogResponse> {
    try {
      if (!window.backendAPI?.notificationLog) {
        throw new Error('Electron API (notificationLog) not available');
      }

      const response = await window.backendAPI.notificationLog({
        method: 'updateLog',
        params: { id, status, errorMessage, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to update notification log');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update notification log');
    }
  }

  /**
   * Delete a notification log (hard delete)
   */
  async delete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.notificationLog) {
        throw new Error('Electron API (notificationLog) not available');
      }

      const response = await window.backendAPI.notificationLog({
        method: 'deleteLog',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Notification log deleted successfully',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete notification log');
    }
  }

  /**
   * Permanently delete a notification log
   */
  async permanentlyDelete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.notificationLog) {
        throw new Error('Electron API (notificationLog) not available');
      }

      const response = await window.backendAPI.notificationLog({
        method: 'permanentlyDeleteLog',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Notification log permanently deleted',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to permanently delete notification log');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 RETRY OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Retry a failed notification log
   */
  async retry(id: number): Promise<RetryResponse> {
    try {
      if (!window.backendAPI?.notificationLog) {
        throw new Error('Electron API (notificationLog) not available');
      }

      const response = await window.backendAPI.notificationLog({
        method: 'retryLog',
        params: { id, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to retry notification log');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to retry notification log');
    }
  }

  /**
   * Retry all failed notification logs
   */
  async retryAllFailed(params?: {
    filters?: {
      recipient_email?: string;
      createdBefore?: string;
    };
  }): Promise<RetryAllResponse> {
    try {
      if (!window.backendAPI?.notificationLog) {
        throw new Error('Electron API (notificationLog) not available');
      }

      const response = await window.backendAPI.notificationLog({
        method: 'retryAllFailed',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to retry all failed logs');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to retry all failed logs');
    }
  }

  /**
   * Resend a notification log (manual resend, regardless of status)
   */
  async resend(id: number): Promise<ResendResponse> {
    try {
      if (!window.backendAPI?.notificationLog) {
        throw new Error('Electron API (notificationLog) not available');
      }

      const response = await window.backendAPI.notificationLog({
        method: 'resendLog',
        params: { id, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to resend notification log');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to resend notification log');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 BATCH OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Bulk create notification logs
   */
  async bulkCreate(logsArray: any[]): Promise<BulkCreateResponse> {
    try {
      if (!window.backendAPI?.notificationLog) {
        throw new Error('Electron API (notificationLog) not available');
      }

      const response = await window.backendAPI.notificationLog({
        method: 'bulkCreateLogs',
        params: { logsArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk create logs');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk create logs');
    }
  }

  /**
   * Bulk update notification logs
   */
  async bulkUpdate(updatesArray: Array<{ id: number; updates: { status: string; errorMessage?: string } }>): Promise<BulkUpdateResponse> {
    try {
      if (!window.backendAPI?.notificationLog) {
        throw new Error('Electron API (notificationLog) not available');
      }

      const response = await window.backendAPI.notificationLog({
        method: 'bulkUpdateLogs',
        params: { updatesArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk update logs');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk update logs');
    }
  }

  /**
   * Import notification logs from CSV file
   */
  async importCSV(filePath: string): Promise<ImportResponse> {
    try {
      if (!window.backendAPI?.notificationLog) {
        throw new Error('Electron API (notificationLog) not available');
      }

      const response = await window.backendAPI.notificationLog({
        method: 'importLogsCSV',
        params: { filePath, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to import logs');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to import logs');
    }
  }

  /**
   * Export notification logs to CSV or JSON
   */
  async export(params?: {
    format?: 'csv' | 'json';
    filters?: any;
  }): Promise<LogExportResponse> {
    try {
      if (!window.backendAPI?.notificationLog) {
        throw new Error('Electron API (notificationLog) not available');
      }

      const response = await window.backendAPI.notificationLog({
        method: 'exportLogs',
        params: params || { format: 'json' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to export logs');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to export logs');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.notificationLog);
  }

  /**
   * Get count of logs by status for a recipient
   */
  async getStatusCounts(recipientEmail: string): Promise<Record<string, number>> {
    try {
      const response = await this.getByRecipient(recipientEmail, { limit: 1000 });
      const counts: Record<string, number> = {};
      for (const log of response.data.items) {
        counts[log.status] = (counts[log.status] || 0) + 1;
      }
      return counts;
    } catch (error) {
      console.error('Error fetching status counts:', error);
      return {};
    }
  }

  /**
   * Check if a recipient has any failed logs
   */
  async hasFailedLogs(recipientEmail: string): Promise<boolean> {
    try {
      const response = await this.getByRecipient(recipientEmail, { limit: 1 });
      return response.data.items.some(log => log.status === 'failed');
    } catch (error) {
      console.error('Error checking failed logs:', error);
      return false;
    }
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const notificationLogAPI = new NotificationLogAPI();
export default notificationLogAPI;