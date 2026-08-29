import React from "react";
import {
  LayoutDashboard, Target, BookOpen, FileText, CheckSquare,
  Archive, Settings, Users, Briefcase, ShieldCheck,
  PanelLeftClose, PanelLeftOpen
} from "lucide-react";

export function Sidebar({ activeTab, setActiveTab, collapsed, onToggleCollapse }) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { id: "goals", label: "Goals", icon: <Target size={18} /> },
    { id: "ledger", label: "Ledger", icon: <BookOpen size={18} /> },
    { id: "invoices", label: "Invoices", icon: <FileText size={18} /> },
    { id: "todos", label: "To-do", icon: <CheckSquare size={18} /> },
    { id: "team", label: "Team", icon: <Users size={18} /> },
    { id: "projects", label: "Projects", icon: <Briefcase size={18} /> },
    { id: "documents", label: "Documents", icon: <Archive size={18} /> },
    { id: "settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  return (
    <aside className={`bc-sidebar ${collapsed ? "collapsed" : ""}`}>
      <button
        className="bc-sidebar-toggle"
        onClick={onToggleCollapse}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>

      <div style={{ marginTop: 6, marginBottom: collapsed ? 12 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: collapsed ? "0 auto" : "0 4px 4px" }}>
          {!collapsed && <ShieldCheck size={22} color="#7C3AED" />}
          <p className="bc-logo" style={{ margin: 0 }}>
            {collapsed ? "V" : "VOUTA"}
          </p>
        </div>
        {!collapsed && <p className="bc-logo-sub">Business Console</p>}
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: collapsed ? 8 : 0 }}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`bc-nav-item ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <span className="bc-nav-icon">{item.icon}</span>
              <span className="bc-nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
