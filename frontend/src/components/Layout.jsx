import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldCheck,
  MagnifyingGlass,
  ListChecks,
  ChartBar,
  Export,
  CaretLeft,
  CaretRight,
  Warning,
  Crosshair,
  GlobeHemisphereWest,
  PresentationChart,
  CheckSquareOffset,
  Bell,
  SignOut,
  User,
} from "@phosphor-icons/react";
import NotificationBell from "@/components/NotificationBell";

const ROLE_COLORS = {
  admin: "bg-[#FF3B30]/15 text-[#FF3B30] border-[#FF3B30]/20",
  analyst: "bg-[#FF9500]/15 text-[#FF9500] border-[#FF9500]/20",
  viewer: "bg-[#34C759]/15 text-[#34C759] border-[#34C759]/20",
};

const allNavItems = [
  { path: "/", label: "Dashboard", icon: ShieldCheck, minRole: "viewer" },
  { path: "/scan", label: "Run Scan", icon: MagnifyingGlass, minRole: "analyst" },
  { path: "/findings", label: "Findings", icon: ListChecks, minRole: "viewer" },
  { path: "/risk", label: "Risk Overview", icon: ChartBar, minRole: "viewer" },
  { path: "/attack", label: "ATT&CK Map", icon: Crosshair, minRole: "viewer" },
  { path: "/threat", label: "Threat Map", icon: GlobeHemisphereWest, minRole: "viewer" },
  { path: "/executive", label: "Executive View", icon: PresentationChart, minRole: "analyst" },
  { path: "/remediation", label: "Remediation", icon: CheckSquareOffset, minRole: "viewer" },
  { path: "/export", label: "Export", icon: Export, minRole: "analyst" },
  { path: "/notifications", label: "Notifications", icon: Bell, minRole: "admin" },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();

  const navItems = allNavItems.filter((item) => hasRole(item.minRole));

  return (
    <div className="flex h-screen overflow-hidden" data-testid="app-layout">
      <aside
        data-testid="sidebar"
        className={`flex flex-col border-r border-[#222222] bg-[#0A0A0A] transition-[width] duration-200 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-[#222222] px-4 py-5">
          <Warning size={24} weight="fill" className="text-[#FF3B30] shrink-0" />
          {!collapsed && (
            <span className="font-['Chivo'] text-lg font-bold tracking-tight text-white whitespace-nowrap">
              CSPM
            </span>
          )}
        </div>

        <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                className={`flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-[#A1A1AA] hover:bg-[#141414] hover:text-white"
                }`}
              >
                <Icon size={18} weight={isActive ? "fill" : "regular"} className="shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-[#222222] p-3">
          {!collapsed && user && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-7 h-7 rounded-full bg-[#222222] flex items-center justify-center shrink-0">
                <User size={14} className="text-[#A1A1AA]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-medium truncate">{user.username}</p>
                <span className={`inline-flex font-['JetBrains_Mono'] text-[10px] px-1.5 py-0 uppercase tracking-wider rounded-sm border ${ROLE_COLORS[user.role] || ROLE_COLORS.viewer}`}>
                  {user.role}
                </span>
              </div>
            </div>
          )}
          <button
            data-testid="logout-button"
            onClick={logout}
            className="flex items-center gap-2 w-full rounded-sm px-3 py-2 text-sm text-[#A1A1AA] hover:bg-[#141414] hover:text-[#FF3B30] transition-colors duration-150"
          >
            <SignOut size={18} className="shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
          <button
            data-testid="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full mt-1 py-2 text-[#A1A1AA] hover:text-white transition-colors duration-150"
          >
            {collapsed ? <CaretRight size={14} /> : <CaretLeft size={14} />}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-[#050505] flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-end gap-3 px-6 py-3 border-b border-[#222222]/50 bg-[#0A0A0A]/50 shrink-0">
          <NotificationBell />
          {user && (
            <span className="font-['JetBrains_Mono'] text-xs text-[#71717A]">{user.username}</span>
          )}
        </div>
        <div className="flex-1 overflow-auto p-6 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
