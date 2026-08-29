import React, { useState } from "react";
import "./styles/global.css";
import { useConsoleData, useAuthState } from "./utils/storage";
import { token as tokenStore } from "./utils/api";
import { Auth } from "./components/Auth";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { GoalsView } from "./components/GoalsView";
import { LedgerView } from "./components/LedgerView";
import { InvoicesView } from "./components/InvoicesView";
import { TodosView } from "./components/TodosView";
import { TeamView } from "./components/TeamView";
import { ProjectsView } from "./components/ProjectsView";
import { DocumentsView } from "./components/DocumentsView";
import { SettingsView } from "./components/SettingsView";

function UserWidget({ currentUser }) {
  const name = currentUser?.ownerName || currentUser?.email || "User";
  const company = currentUser?.businessName || "My Business";
  const role = (currentUser?.role || "admin").toLowerCase();
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="bc-user-widget">
      <div className="bc-user-widget-avatar">{initials}</div>
      <div className="bc-user-widget-details">
        <span className="bc-user-widget-name">{name}</span>
        <span className="bc-user-widget-company">{company}</span>
      </div>
      <span className={`bc-role-badge ${role}`} style={{ marginLeft: 4 }}>
        {role}
      </span>
    </div>
  );
}

export default function App() {
  const { currentUser, setCurrentUser, authLoading } = useAuthState();
  const { data, loading: dataLoading, error, refetch, updateResource } = useConsoleData(!!currentUser);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (authLoading) {
    return (
      <div className="bc-auth-page">
        <p style={{ fontSize: 20, fontWeight: 600, color: "#A1A1AA" }}>
          Loading Console...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Auth
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    );
  }

  const handleLogout = () => {
    tokenStore.clear();
    setCurrentUser(null);
  };

  const userRole = (currentUser?.role || "admin").toLowerCase();
  const sharedProps = { data, refetch, updateResource, userRole };

  return (
    <div className="bc-root">
      <div className="bc-app-shell">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="bc-main">
          <div className="bc-header-bar">
            <UserWidget currentUser={currentUser} />
          </div>

          <div className="bc-main-content">
            {dataLoading && (
              <div style={{ padding: "60px 0", textAlign: "center", color: "#A1A1AA" }}>
                Loading data...
              </div>
            )}
            {error && !dataLoading && (
              <div className="bc-card" style={{ borderColor: "#FCA5A5", marginBottom: 20 }}>
                <p style={{ color: "#EF4444", fontWeight: 600, margin: 0 }}>
                  Could not reach server: {error}
                </p>
              </div>
            )}

            {!dataLoading && (
              <>
                {activeTab === "dashboard"  && <Dashboard {...sharedProps} setActiveTab={setActiveTab} />}
                {activeTab === "goals"      && <GoalsView {...sharedProps} />}
                {activeTab === "ledger"     && <LedgerView {...sharedProps} />}
                {activeTab === "invoices"   && <InvoicesView {...sharedProps} />}
                {activeTab === "todos"      && <TodosView {...sharedProps} />}
                {activeTab === "team"       && <TeamView {...sharedProps} />}
                {activeTab === "projects"   && <ProjectsView {...sharedProps} />}
                {activeTab === "documents"  && <DocumentsView {...sharedProps} />}
                {activeTab === "settings"   && <SettingsView currentUser={currentUser} setCurrentUser={setCurrentUser} onLogout={handleLogout} />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
