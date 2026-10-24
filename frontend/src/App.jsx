import React, { useState, useEffect } from "react";
import "./styles/global.css";
import { useConsoleData, useAuthState } from "./utils/storage";
import { auth, token as tokenStore } from "./utils/api";
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

/**
 * Shows messages sent with notify(), plus any action that failed without its own error
 * handling (an unhandled promise rejection), so a failed save is never silent.
 */
function Toaster() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    let nextId = 0;
    const push = (text) => {
      const id = ++nextId;
      setMessages((m) => [...m.slice(-2), { id, text }]);
      setTimeout(() => setMessages((m) => m.filter((x) => x.id !== id)), 5000);
    };
    const onToast = (e) => push(e.detail);
    const onRejection = (e) => {
      // A 401 already signs the user out; no toast needed
      if (e.reason?.status === 401) return;
      push(e.reason?.message || "Something went wrong. Please try again.");
    };
    window.addEventListener("vouta:toast", onToast);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("vouta:toast", onToast);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  if (messages.length === 0) return null;
  return (
    <div role="status" aria-live="polite" style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 1000,
      display: "flex", flexDirection: "column", gap: 8, width: "min(420px, calc(100vw - 32px))",
    }}>
      {messages.map((m) => (
        <div key={m.id} style={{
          background: "#18181B", color: "#FFFFFF", padding: "10px 14px", borderRadius: 8,
          fontSize: 13.5, fontWeight: 500, boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        }}>
          {m.text}
        </div>
      ))}
    </div>
  );
}

function UserWidget({ currentUser }) {
  const name = currentUser?.displayName || currentUser?.ownerName || currentUser?.email || "User";
  const company = currentUser?.businessName || "My Business";
  const role = (currentUser?.role || "admin").toLowerCase();
  const initials = name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

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
      <>
      <Toaster />
      <Auth
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
      </>
    );
  }

  const handleLogout = async () => {
    try {
      await auth.logout(); // Clears the httpOnly cookie server-side
    } catch {
      // Ignore errors — clear local state regardless
    }
    tokenStore.clear();
    setCurrentUser(null);
  };

  const userRole = (currentUser?.role || "admin").toLowerCase();
  const sharedProps = { data, refetch, updateResource, userRole };

  return (
    <div className="bc-root">
      <Toaster />
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
                {activeTab === "settings"   && <SettingsView currentUser={currentUser} setCurrentUser={setCurrentUser} onLogout={handleLogout} onWorkspaceChange={refetch} />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
