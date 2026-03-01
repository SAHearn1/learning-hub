'use client';

import { useCallback, useEffect, useState } from 'react';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/count');
      if (res.ok) {
        const json = await res.json();
        setCount(json.count ?? 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  const handleOpen = async () => {
    setOpen(!open);
    if (!open) {
      try {
        const res = await fetch('/api/notifications?unreadOnly=false');
        if (res.ok) {
          const json = await res.json();
          setNotifications(json.data ?? []);
        }
      } catch {
        // ignore
      }
    }
  };

  const handleMarkAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markAllRead' }),
    });
    setCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      await fetch(`/api/notifications/${n.id}/read`, { method: 'POST' });
      setCount(prev => Math.max(0, prev - 1));
    }
    if (n.href) window.location.href = n.href;
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative rounded-full p-2 hover:bg-neutral-100"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {count > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-neutral-500">No notifications</div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  onClick={() => void handleClick(n)}
                  className={`block w-full border-b px-4 py-3 text-left hover:bg-neutral-50 ${!n.read ? 'bg-blue-50/50' : ''}`}
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="mt-0.5 text-xs text-neutral-600 line-clamp-2">{n.body}</p>
                  <p className="mt-1 text-[10px] text-neutral-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
