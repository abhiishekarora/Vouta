import React from "react";
import {
  LayoutDashboard, Target, BookOpen, FileText, CheckSquare,
  Archive, Settings, LogOut, ShieldCheck, Users, Briefcase
} from "lucide-react";

export function Sidebar({ activeTab, setActiveTab, currentUser, onLogout }) {
  const role = (currentUser?.role || "admin").toLowerCase();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={17} /> },
    { id: "goals", label: "Goals", icon: <Target size={17} /> },
    { id: "ledger", label: "Ledger", icon: <BookOpen size={17} /> },
    { id: "invoices", label: "Invoices", icon: <FileText size={17} /> },
    { id: "todos", label: "To-do", icon: <CheckSquare size={17} /> },
    { id: "team", label: "Team", icon: <Users size={17} /> },
    { id: "projects", label: "Projects", icon: <Briefcase size={17} /> },
    { id: "documents", label: "Documents", icon: <Archive size={17} /> },
    { id: "settings", label: "Settings", icon: <Settings size={17} /> },
  ];

  return (
    <aside className="bc-sidebar">
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 8px 4px" }}>
          <ShieldCheck size={20} color="#FFFFFF" />
          <p className="bc-logo" style={{ margin: 0 }}>VOUTA</p>
        </div>
        <p className="bc-logo-sub">Business Console</p>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`bc-nav-item ${activeTab === item.id ? "active" : ""}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {currentUser && (
        <div className="bc-user-panel">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
              marginTop: 6,
            }}
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
