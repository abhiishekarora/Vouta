import React from "react";
import {
  LayoutDashboard, Target, BookOpen, FileText, CheckSquare,
  Archive, Settings, LogOut, ShieldCheck, Users, Briefcase
} from "lucide-react";

export function Sidebar({ activeTab, setActiveTab, currentUser, onLogout }) {
  const role = (currentUser?.role || "admin").toLowerCase();

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
    <aside className="bc-sidebar">
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 8px 4px" }}>
          <ShieldCheck size={22} color="#09090B" />
          <p className="bc-logo" style={{ margin: 0 }}>VOUTA</p>
        </div>
        <p className="bc-logo-sub">Business Console</p>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`bc-nav-item ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="bc-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {currentUser && (
        <div className="bc-user-panel">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#09090B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentUser.businessName || "My Business"}
            </span>
            <span className={`bc-role-badge ${role}`}>
              {role}
            </span>
          </div>
          <div className="bc-user-info">
            {currentUser.ownerName || currentUser.email}
          </div>
          <button
            className="bc-btn bc-btn-ghost bc-btn-sm"
            onClick={onLogout}
            style={{
              width: "100%",
              justifyContent: "center",
              marginTop: 8,
            }}
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
