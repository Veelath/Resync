import React from 'react';
import { Bell } from 'lucide-react';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  scanId?: string;
}

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

  const handleClick = (notif: AppNotification) => {
    setNotifications(notifications.map(n =>
      n.id === notif.id ? { ...n, read: true } : n
    ));
    if (notif.scanId) {
      onOpenScan(notif.scanId);
    }
  };

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <Bell className="w-6 h-6 text-indigo-600" /> Notification History
        </h2>
        {notifications.some(n => !n.read) && (
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
              onClick={() => handleClick(notif)}
              className={`p-6 rounded-2xl border text-left cursor-pointer transition-all ${
                notif.read
                  ? 'bg-white border-slate-200 hover:bg-slate-50'
                  : 'bg-indigo-50/20 border-indigo-200 hover:bg-indigo-50/40'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className={`text-base font-bold mb-1 truncate ${notif.read ? 'text-slate-700' : 'text-indigo-950'}`}>
                    {notif.title}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {notif.message}
                  </p>
                  {notif.scanId && (
                    <div className="mt-3 text-xs text-indigo-600 font-semibold">
                      Click to open scan →
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {new Date(notif.timestamp).toLocaleString()}
                  </span>
                  {!notif.read && (
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
