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

export default function App() {
  const { currentUser, setCurrentUser, authLoading } = useAuthState();
  const { data, loading: dataLoading, error, refetch, updateResource } = useConsoleData(!!currentUser);
  const [activeTab, setActiveTab] = useState("dashboard");

  if (authLoading) {
    return (
      <div className="bc-auth-page">
        <p style={{ fontFamily: "Zilla Slab, serif", fontSize: 20, fontWeight: 600, color: "var(--ink-soft)" }}>
          Loading Console…
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

  const sharedProps = { data, refetch, updateResource };

  return (
    <div className="bc-root">
      <div className="bc-app-shell">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        <main className="bc-main">
          {dataLoading && (
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ink-soft)" }}>
              Loading data…
            </div>
          )}
          {error && !dataLoading && (
            <div className="bc-card" style={{ borderColor: "var(--brick)", marginBottom: 20 }}>
              <p style={{ color: "var(--brick)", fontWeight: 600, margin: 0 }}>
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
              {activeTab === "settings"   && <SettingsView currentUser={currentUser} setCurrentUser={setCurrentUser} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
