import React from "react";
import {
  LayoutDashboard, Target, BookOpen, FileText, CheckSquare,
  Archive, Settings, Users, Briefcase, ShieldCheck,
  Menu, X
} from "lucide-react";

export function Sidebar({ activeTab, setActiveTab, collapsed, onToggleCollapse }) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { id: "goals", label: "Goals", icon: <Target size={20} /> },
    { id: "ledger", label: "Ledger", icon: <BookOpen size={20} /> },
    { id: "invoices", label: "Invoices", icon: <FileText size={20} /> },
    { id: "todos", label: "To-do", icon: <CheckSquare size={20} /> },
    { id: "team", label: "Team", icon: <Users size={20} /> },
    { id: "projects", label: "Projects", icon: <Briefcase size={20} /> },
    { id: "documents", label: "Documents", icon: <Archive size={20} /> },
    { id: "settings", label: "Settings", icon: <Settings size={20} /> },
  ];

  return (
    <aside className={`bc-sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Top row: burger toggle + logo */}
      <div className="bc-sidebar-top">
        <button
          className="bc-sidebar-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand menu" : "Collapse menu"}
        >
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </button>

        {!collapsed && (
          <div className="bc-sidebar-brand">
            <ShieldCheck size={20} color="#7C3AED" />
            <span className="bc-logo">Vouta</span>
          </div>
        )}
      </div>

      {!collapsed && <p className="bc-logo-sub">Business Console</p>}

      <nav className="bc-sidebar-nav">
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
              {!collapsed && <span className="bc-nav-label">{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
