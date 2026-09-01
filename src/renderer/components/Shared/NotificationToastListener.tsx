// src/components/Shared/NotificationToastListener.tsx
import { useEffect, useRef } from "react";
import { showToast } from "../../utils/notification";

type QueuedNotification = {
  title: string;
  message: string;
  type: string;
  id?: number; // optional ID from backend
};

// Map backend types to toast types
const mapType = (type: string): "success" | "error" | "warning" | "info" | "critical" => {
  switch (type) {
    case "payment_confirmation": return "success";
    case "overdue": return "warning";
    case "error": return "error";
    case "critical": return "critical";
    default: return "info";
  }
};

export const NotificationToastListener = () => {
  const queueRef = useRef<QueuedNotification[]>([]);
  const isShowingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── SIMPLE DEDUPLICATION CACHE ──────────────────────────────────
  const recentRef = useRef<Map<string, number>>(new Map());

  const getKey = (n: QueuedNotification): string => {
    return n.id ? `id:${n.id}` : `msg:${n.title}|${n.message}`;
  };

  const isDuplicate = (n: QueuedNotification): boolean => {
    const key = getKey(n);
    const last = recentRef.current.get(key);
    const now = Date.now();
    // If shown within the last 2 seconds, treat as duplicate
    if (last && now - last < 2000) return true;
    // Update timestamp
    recentRef.current.set(key, now);
    // Clean old entries (older than 5 seconds)
    for (const [k, t] of recentRef.current) {
      if (now - t > 5000) recentRef.current.delete(k);
    }
    return false;
  };

  // ─── PROCESS QUEUE ──────────────────────────────────────────────

  const showNext = () => {
    if (isShowingRef.current) return;
    if (queueRef.current.length === 0) return;

    // Remove duplicates from queue
    const seen = new Set<string>();
    const unique = queueRef.current.filter((n) => {
      const key = getKey(n);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    queueRef.current = unique;

    if (queueRef.current.length === 0) return;

    const next = queueRef.current.shift();
    if (!next) return;

    // Final duplicate check (in case it was shown just before)
    if (isDuplicate(next)) {
      // Skip and continue
      isShowingRef.current = false;
      showNext();
      return;
    }

    isShowingRef.current = true;
    const { title, message, type } = next;

    // Show toast
    showToast(`${title}: ${message}`, mapType(type), {
      duration: 5000,
      autoClose: true,
    });

    // Schedule next toast after a delay
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      isShowingRef.current = false;
      showNext();
    }, 5200);
  };

  const addToQueue = (notification: QueuedNotification) => {
    // Quick check: if it's a duplicate of something already in queue, ignore
    const key = getKey(notification);
    const alreadyInQueue = queueRef.current.some((n) => getKey(n) === key);
    if (alreadyInQueue) return;

    // Also check recent cache (if shown very recently)
    if (isDuplicate(notification)) return;

    // Add to queue
    queueRef.current.push(notification);
    // Debug log (remove if not needed)
    console.debug(`[NotificationToast] Queued: ${notification.title} (${queueRef.current.length} total)`);
    showNext();
  };

  // ─── EVENT LISTENER ──────────────────────────────────────────────

  useEffect(() => {
    const handleNotificationCreated = (_event: any, data: any) => {
      // Debug log (remove if not needed)
      console.debug("[NotificationToast] Received event:", data);
      addToQueue({
        title: data.title,
        message: data.message,
        type: data.type,
        id: data.id, // if the backend provides it
      });
    };

    if (window.backendAPI?.on) {
      window.backendAPI.on("notification:created", handleNotificationCreated);
      console.debug("[NotificationToast] Listener attached to 'notification:created'");
    } else {
      console.warn("[NotificationToast] window.backendAPI.on is not available");
    }

    return () => {
      if (window.backendAPI?.off) {
        window.backendAPI.off("notification:created", handleNotificationCreated);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return null;
};