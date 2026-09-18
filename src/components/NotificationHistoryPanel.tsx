import React, { useEffect, useState } from 'react';
import { AppNotification } from '../types.js';
import { markNotificationRead } from '../services/api.js';

interface NotificationHistoryPanelProps {
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  onOpenScan: (scanId: string) => void;
}

export default function NotificationHistoryPanel({
  notifications,
  setNotifications,
  onOpenScan
}: NotificationHistoryPanelProps) {

  const handleMarkAsRead = async (notif: AppNotification) => {
    if (!notif.notification_isread) {
      try {
        await markNotificationRead(notif.id);
        setNotifications(notifications.map(n => n.id === notif.id ? { ...n, notification_isread: true } : n));
      } catch (e) {
        console.error('Failed to mark read', e);
      }
    }
    if (notif.analysis_run_id) {
      onOpenScan(notif.analysis_run_id);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.notification_isread);
    for (const notif of unread) {
      try {
        await markNotificationRead(notif.id);
      } catch (e) {
        console.error('Failed to mark read', e);
      }
    }
    setNotifications(notifications.map(n => ({ ...n, notification_isread: true })));
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-extrabold text-slate-800">Notification History</h2>
        {notifications.some(n => !n.notification_isread) && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            No notifications available.
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              onClick={() => handleMarkAsRead(notif)}
              className={`p-6 rounded-2xl border text-left cursor-pointer transition-all ${
                notif.notification_isread 
                  ? 'bg-white border-slate-200 hover:bg-slate-50' 
                  : 'bg-indigo-50/20 border-indigo-200 hover:bg-indigo-50/40'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className={`text-lg font-bold mb-1 ${notif.notification_isread ? 'text-slate-800' : 'text-indigo-950'}`}>
                    {notif.notification_payload.title}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {notif.notification_payload.message}
                  </p>
                  {notif.notification_payload.manuscript_title && (
                    <div className="mt-3 text-xs text-slate-500 font-mono bg-slate-100 inline-block px-2 py-1 rounded">
                      Document: {notif.notification_payload.manuscript_title}
                    </div>
                  )}
                  {notif.notification_payload.coherence_score !== undefined && (
                    <div className="mt-2 text-xs font-bold text-indigo-700">
                      Coherence Score: {notif.notification_payload.coherence_score}
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-400 whitespace-nowrap">
                  {new Date(notif.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
