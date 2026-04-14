import { useState, useEffect, useRef } from "react";
import { api } from "@/services/api";
import { Bell } from "@phosphor-icons/react";

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    api.getUnreadCount().then((r) => setUnread(r.data.count || 0)).catch(() => {});
    const interval = setInterval(() => {
      api.getUnreadCount().then((r) => setUnread(r.data.count || 0)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleOpen = async () => {
    if (!open) {
      try {
        const res = await api.getNotifications();
        setItems((res.data.notifications || []).slice(0, 5));
      } catch (e) {}
    }
    setOpen(!open);
  };

  const handleMarkRead = async () => {
    await api.markNotificationsRead();
    setUnread(0);
    setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
  };

  const typeColors = {
    critical_alert: "text-[#FF3B30]",
    high_risk: "text-[#FF9500]",
    new_finding: "text-[#007AFF]",
  };

  return (
    <div className="relative" ref={ref}>
      <button
        data-testid="notification-bell"
        onClick={handleOpen}
        className="relative p-1.5 text-[#A1A1AA] hover:text-white transition-colors duration-150"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#FF3B30] rounded-full flex items-center justify-center text-[10px] text-white font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0A0A0A] border border-[#222222] rounded-sm shadow-lg z-50" data-testid="notification-dropdown">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#222222]">
            <span className="font-['Chivo'] text-sm font-bold text-white">Notifications</span>
            {unread > 0 && (
              <button
                onClick={handleMarkRead}
                data-testid="mark-all-read"
                className="text-[#007AFF] text-xs hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-[#71717A] text-sm text-center">No notifications</p>
            ) : (
              items.map((item, i) => (
                <div
                  key={i}
                  className={`px-4 py-3 border-b border-[#222222]/50 ${!item.is_read ? "bg-[#141414]" : ""}`}
                >
                  <p className={`text-sm ${typeColors[item.type] || "text-white"}`}>{item.message}</p>
                  <p className="font-['JetBrains_Mono'] text-[10px] text-[#71717A] mt-1">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
