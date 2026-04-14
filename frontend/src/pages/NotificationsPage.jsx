import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { Bell } from "@phosphor-icons/react";

const TYPE_CONFIG = {
  critical_alert: { color: "text-[#FF3B30]", bg: "bg-[#FF3B30]/10" },
  high_risk: { color: "text-[#FF9500]", bg: "bg-[#FF9500]/10" },
  new_finding: { color: "text-[#007AFF]", bg: "bg-[#007AFF]/10" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getNotifications()
      .then((res) => setNotifications(res.data.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async () => {
    await api.markNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#333333] border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="notifications-page">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-['Chivo'] text-4xl sm:text-5xl font-black tracking-tight text-white mb-1">Notifications</h1>
          <p className="text-[#A1A1AA] text-base">{notifications.length} total notifications</p>
        </div>
        <button
          data-testid="mark-all-read-btn"
          onClick={handleMarkRead}
          className="bg-transparent border border-[#222222] text-white rounded-sm px-4 py-2 hover:bg-[#141414] transition-colors duration-150 text-sm"
        >
          Mark All as Read
        </button>
      </div>

      <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm overflow-hidden">
        {notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={40} className="text-[#333333] mx-auto mb-3" />
            <p className="text-[#71717A] text-sm">No notifications yet. Run a scan to generate alerts.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#222222]">
                <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 px-4">Type</th>
                <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 px-4">Message</th>
                <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 px-4">Findings</th>
                <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 px-4">Time</th>
                <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n, i) => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.new_finding;
                return (
                  <tr key={i} className={`border-b border-[#222222]/50 hover:bg-[#141414] transition-colors duration-150 ${!n.is_read ? "bg-[#141414]/50" : ""}`}>
                    <td className="py-3 px-4">
                      <span className={`font-['JetBrains_Mono'] text-xs px-2 py-0.5 rounded-sm ${cfg.bg} ${cfg.color} uppercase`}>
                        {n.type?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white text-sm">{n.message}</td>
                    <td className="py-3 px-4 font-['JetBrains_Mono'] text-xs text-[#A1A1AA]">{n.findings_count || 0}</td>
                    <td className="py-3 px-4 font-['JetBrains_Mono'] text-xs text-[#71717A]">{n.created_at ? new Date(n.created_at).toLocaleString() : ""}</td>
                    <td className="py-3 px-4">
                      <span className={`w-2 h-2 rounded-full inline-block ${n.is_read ? "bg-[#71717A]" : "bg-[#34C759]"}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
