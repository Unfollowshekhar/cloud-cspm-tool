import { useState, useCallback } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  ShieldCheck,
  MagnifyingGlass,
  ListChecks,
  ChartBar,
  Export,
  CaretLeft,
  CaretRight,
  Warning,
} from "@phosphor-icons/react";

const navItems = [
  { path: "/", label: "Dashboard", icon: ShieldCheck },
  { path: "/scan", label: "Run Scan", icon: MagnifyingGlass },
  { path: "/findings", label: "Findings", icon: ListChecks },
  { path: "/risk", label: "Risk Overview", icon: ChartBar },
  { path: "/export", label: "Export", icon: Export },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden" data-testid="app-layout">
      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        className={`flex flex-col border-r border-[#222222] bg-[#0A0A0A] transition-[width] duration-200 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {/* Logo area */}
        <div className="flex items-center gap-3 border-b border-[#222222] px-4 py-5">
          <Warning size={24} weight="fill" className="text-[#FF3B30] shrink-0" />
          {!collapsed && (
            <span className="font-['Chivo'] text-lg font-bold tracking-tight text-white whitespace-nowrap">
              CSPM
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-2">
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
                className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-[#A1A1AA] hover:bg-[#141414] hover:text-white"
                }`}
              >
                <Icon
                  size={20}
                  weight={isActive ? "fill" : "regular"}
                  className="shrink-0"
                />
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          data-testid="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center border-t border-[#222222] py-3 text-[#A1A1AA] hover:text-white hover:bg-[#141414] transition-colors duration-150"
        >
          {collapsed ? <CaretRight size={16} /> : <CaretLeft size={16} />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-[#050505]">
        <div className="p-6 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
