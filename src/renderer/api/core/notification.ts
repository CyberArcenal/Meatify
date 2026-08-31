// src/api/core/notification.ts

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'purchase' | 'sale';
  isRead: boolean;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface PaginatedNotifications {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationStatistics {
  total: number;
  read: number;
  unread: number;
  byType: Record<string, number>;
  last7Days: number;
  last24Hours: number;
  topUsers: Array<{
    userId: number;
    count: number;
  }>;
}

export interface BulkCreateResult {
  created: Notification[];
  errors: Array<{ notification: any; error: string }>;
}

export interface BulkUpdateResult {
  updated: Notification[];
  errors: Array<{ id: number; updates: any; error: string }>;
}

export interface ImportResult {
  imported: Notification[];
  errors: Array<{ row: any; error: string }>;
}

export interface NotificationExportData {
  format: string;
  data: string | Notification[];
  filename: string;
}

export interface MarkAllResult {
  count: number;
  notifications: Notification[];
}

// ----------------------------------------------------------------------
// 📨 Response Interfaces
// ----------------------------------------------------------------------

export interface NotificationsResponse {
  status: boolean;
  message: string;
  data: PaginatedNotifications;
}

export interface NotificationResponse {
  status: boolean;
  message: string;
  data: Notification;
}

export interface NotificationStatisticsResponse {
  status: boolean;
  message: string;
  data: NotificationStatistics;
}

export interface NotificationExportResponse {
  status: boolean;
  message: string;
  data: NotificationExportData;
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

export interface MarkAllResponse {
  status: boolean;
  message: string;
  data: MarkAllResult;
}

export interface DeleteAllReadResponse {
  status: boolean;
  message: string;
  data: {
    count: number;
  };
}

// ----------------------------------------------------------------------
// 🧠 NotificationAPI Class
// ----------------------------------------------------------------------

class NotificationAPI {
  // --------------------------------------------------------------------
  // 🔎 READ-ONLY METHODS
  // --------------------------------------------------------------------

  /**
   * Get all notifications with pagination and filters
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    userId?: number;
    isRead?: boolean;
    type?: string | string[];
    startDate?: string;
    endDate?: string;
    search?: string;
    includeDeleted?: boolean;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<NotificationsResponse> {
    try {
      if (!window.backendAPI?.notification) {
        throw new Error('Electron API (notification) not available');
      }

      const response = await window.backendAPI.notification({
        method: 'getAllNotifications',
        params: params || {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch notifications');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch notifications');
    }
  }

  /**
   * Get a single notification by ID
   */
  async getById(id: number, includeDeleted: boolean = false): Promise<NotificationResponse> {
    try {
      if (!window.backendAPI?.notification) {
        throw new Error('Electron API (notification) not available');
      }

      const response = await window.backendAPI.notification({
        method: 'getNotificationById',
        params: { id, includeDeleted },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch notification');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch notification');
    }
  }

  /**
   * Get notifications for a specific user
   */
  async getByUser(
    userId: number,
    params?: {
      isRead?: boolean;
      page?: number;
      limit?: number;
      includeDeleted?: boolean;
    }
  ): Promise<NotificationsResponse> {
    try {
      if (!window.backendAPI?.notification) {
        throw new Error('Electron API (notification) not available');
      }

      const response = await window.backendAPI.notification({
        method: 'getNotificationsByUser',
        params: { userId, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch notifications by user');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch notifications by user');
    }
  }

  /**
   * Get unread notifications for a user
   */
  async getUnread(userId: number, params?: {
    page?: number;
    limit?: number;
  }): Promise<NotificationsResponse> {
    try {
      if (!window.backendAPI?.notification) {
        throw new Error('Electron API (notification) not available');
      }

      const response = await window.backendAPI.notification({
        method: 'getUnreadNotifications',
        params: { userId, ...params },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to fetch unread notifications');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch unread notifications');
    }
  }

  /**
   * Get notification statistics
   */
  async getStatistics(): Promise<NotificationStatisticsResponse> {
    try {
      if (!window.backendAPI?.notification) {
        throw new Error('Electron API (notification) not available');
      }

      const response = await window.backendAPI.notification({
        method: 'getNotificationStatistics',
        params: {},
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
   * Search notifications with flexible filters
   */
  async search(params: {
    searchTerm?: string;
    userId?: number;
    isRead?: boolean;
    type?: string | string[];
    startDate?: string;
    endDate?: string;
    includeDeleted?: boolean;
    page?: number;
    limit?: number;
  }): Promise<NotificationsResponse> {
    try {
      if (!window.backendAPI?.notification) {
        throw new Error('Electron API (notification) not available');
      }

      const response = await window.backendAPI.notification({
        method: 'searchNotifications',
        params,
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to search notifications');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to search notifications');
    }
  }

  // --------------------------------------------------------------------
  // ✏️ WRITE OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Create a new notification
   */
  async create(data: {
    userId: number;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error' | 'purchase' | 'sale';
    metadata?: Record<string, any>;
  }): Promise<NotificationResponse> {
    try {
      if (!window.backendAPI?.notification) {
        throw new Error('Electron API (notification) not available');
      }

      const response = await window.backendAPI.notification({
        method: 'createNotification',
        params: { ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to create notification');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create notification');
    }
  }

  /**
   * Update an existing notification (title, message, type, metadata only)
   */
  async update(
    id: number,
    data: Partial<{
      title: string;
      message: string;
      type: string;
      metadata: Record<string, any>;
    }>
  ): Promise<NotificationResponse> {
    try {
      if (!window.backendAPI?.notification) {
        throw new Error('Electron API (notification) not available');
      }

      const response = await window.backendAPI.notification({
        method: 'updateNotification',
        params: { id, ...data, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to update notification');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update notification');
    }
  }

  /**
   * Soft delete a notification
   */
  async delete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.notification) {
        throw new Error('Electron API (notification) not available');
      }

      const response = await window.backendAPI.notification({
        method: 'deleteNotification',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Notification deleted successfully',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete notification');
    }
  }

  /**
   * Restore a soft-deleted notification
   */
  async restore(id: number): Promise<NotificationResponse> {
    try {
      if (!window.backendAPI?.notification) {
        throw new Error('Electron API (notification) not available');
      }

      const response = await window.backendAPI.notification({
        method: 'restoreNotification',
        params: { id, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to restore notification');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to restore notification');
    }
  }

  /**
   * Permanently delete a notification
   */
  async permanentlyDelete(id: number): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI?.notification) {
        throw new Error('Electron API (notification) not available');
      }

      const response = await window.backendAPI.notification({
        method: 'permanentlyDeleteNotification',
        params: { id, user: 'system' },
      });

      return {
        status: response.status,
        message: response.message || 'Notification permanently deleted',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to permanently delete notification');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 STATE TRANSITIONS (via StateService)
  // --------------------------------------------------------------------

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: number): Promise<NotificationResponse> {
    try {
      if (!window.backendAPI?.notification) {
        throw new Error('Electron API (notification) not available');
      }

      const response = await window.backendAPI.notification({
        method: 'markAsRead',
        params: { notificationId, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to mark notification as read');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to mark notification as read');
    }
  }

  /**
   * Mark a notification as unread
   */
  async markAsUnread(notificationId: number): Promise<NotificationResponse> {
    try {
      if (!window.backendAPI?.notification) {
        throw new Error('Electron API (notification) not available');
      }

      const response = await window.backendAPI.notification({
        method: 'markAsUnread',
        params: { notificationId, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to mark notification as unread');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to mark notification as unread');
    }
  }

  /**
   * Mark all notifications for a user as read
   */
  async markAllAsRead(userId: number): Promise<MarkAllResponse> {
    try {
      if (!window.backendAPI?.notification) {
        throw new Error('Electron API (notification) not available');
      }

      const response = await window.backendAPI.notification({
        method: 'markAllAsRead',
        params: { userId, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to mark all notifications as read');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to mark all notifications as read');
    }
  }

  /**
   * Mark all notifications for a user as unread
   */
  async markAllAsUnread(userId: number): Promise<MarkAllResponse> {
    try {
      if (!window.backendAPI?.notification) {
        throw new Error('Electron API (notification) not available');
      }

      const response = await window.backendAPI.notification({
        method: 'markAllAsUnread',
        params: { userId, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to mark all notifications as unread');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to mark all notifications as unread');
    }
  }

  /**
   * Delete all read notifications for a user
   */
  async deleteAllRead(userId: number): Promise<DeleteAllReadResponse> {
    try {
      if (!window.backendAPI?.notification) {
        throw new Error('Electron API (notification) not available');
      }

      const response = await window.backendAPI.notification({
        method: 'deleteAllRead',
        params: { userId, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to delete read notifications');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete read notifications');
    }
  }

  // --------------------------------------------------------------------
  // 🔄 BATCH OPERATIONS
  // --------------------------------------------------------------------

  /**
   * Bulk create notifications
   */
  async bulkCreate(notificationsArray: any[]): Promise<BulkCreateResponse> {
    try {
      if (!window.backendAPI?.notification) {
        throw new Error('Electron API (notification) not available');
      }

      const response = await window.backendAPI.notification({
        method: 'bulkCreateNotifications',
        params: { notificationsArray, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to bulk create notifications');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to bulk create notifications');
    }
  }

  /**
   * Import notifications from CSV file
   */
  async importCSV(filePath: string): Promise<ImportResponse> {
    try {
      if (!window.backendAPI?.notification) {
        throw new Error('Electron API (notification) not available');
      }

      const response = await window.backendAPI.notification({
        method: 'importNotificationsCSV',
        params: { filePath, user: 'system' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to import notifications');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to import notifications');
    }
  }

  /**
   * Export notifications to CSV or JSON
   */
  async export(params?: {
    format?: 'csv' | 'json';
    filters?: any;
  }): Promise<NotificationExportResponse> {
    try {
      if (!window.backendAPI?.notification) {
        throw new Error('Electron API (notification) not available');
      }

      const response = await window.backendAPI.notification({
        method: 'exportNotifications',
        params: params || { format: 'json' },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || 'Failed to export notifications');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to export notifications');
    }
  }

  // --------------------------------------------------------------------
  // 🧰 UTILITY METHODS
  // --------------------------------------------------------------------

  /**
   * Check if the backend API is available
   */
  async isAvailable(): Promise<boolean> {
    return !!(window.backendAPI?.notification);
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: number): Promise<number> {
    try {
      const response = await this.getUnread(userId, { limit: 1 });
      return response.data.total;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  /**
   * Get total count of notifications for a user
   */
  async getTotalCount(userId: number): Promise<number> {
    try {
      const response = await this.getByUser(userId, { limit: 1 });
      return response.data.total;
    } catch (error) {
      console.error('Error fetching total count:', error);
      return 0;
    }
  }

  /**
   * Check if a user has unread notifications
   */
  async hasUnread(userId: number): Promise<boolean> {
    const count = await this.getUnreadCount(userId);
    return count > 0;
  }
}

// ----------------------------------------------------------------------
// 📤 Export singleton instance
// ----------------------------------------------------------------------

const notificationAPI = new NotificationAPI();
export default notificationAPI;