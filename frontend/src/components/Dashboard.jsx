import React, { useMemo } from "react";
import { Wallet, TrendingUp, TrendingDown, FileText, AlertCircle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { StatCard, EmptyState } from "./Modal";
import { INR, monthKey, monthLabel, computeDocStatus, DOC_STATUS_STYLES, PRIORITY_STYLES } from "../utils/helpers";

export function Dashboard({ data, setActiveTab }) {
  const now = new Date();
  const thisMonthKey = monthKey(now);

  const monthTx = data.transactions.filter((t) => monthKey(t.date) === thisMonthKey);
  const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const allBalance = data.transactions.reduce(
    (s, t) => s + (t.type === "income" ? Number(t.amount) : -Number(t.amount)), 0
  );
  const dueInvoices = data.invoices.filter((i) => i.status !== "paid");
  const openTodos = data.todos.filter((t) => !t.done);

  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(monthKey(d));
    }
    return months.map((mk) => {
      const tx = data.transactions.filter((t) => monthKey(t.date) === mk);
      return {
        month: monthLabel(mk),
        Income: tx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
        Expenses: tx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
      };
    });
  }, [data.transactions]);

  const recentTx = [...data.transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const docAlerts = (data.documents || []).filter((d) => {
    const s = computeDocStatus(d);
    return s === "Expiring soon" || s === "Expired";
  });

  return (
    <div>
      <div className="bc-topbar">
        <div>
          <h1 className="bc-page-title">Dashboard</h1>
          <p className="bc-page-sub">
            {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {docAlerts.length > 0 && (
        <div className="bc-card" style={{ marginBottom: 20, borderColor: "var(--brick)", background: "#FDF8F7" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <AlertCircle size={18} color="var(--brick)" />
            <p className="bc-section-title" style={{ color: "var(--brick)", margin: 0 }}>
              Compliance documents needing attention ({docAlerts.length})
            </p>
          </div>
          {docAlerts.map((d) => {
            const s = computeDocStatus(d);
            return (
              <div key={d.id} className="bc-ledger-row">
                <span style={{ flex: 1, fontWeight: 500 }}>{d.title}</span>
                <span style={{ fontSize: 12, color: "var(--ink-soft)", fontFamily: "IBM Plex Mono, monospace" }}>
                  {d.expiryDate ? `Expires ${d.expiryDate}` : "No expiry date"}
                </span>
                <span className="bc-tag" style={{ color: DOC_STATUS_STYLES[s]?.color || "var(--brick)", background: "transparent", border: "1px solid currentColor" }}>
                  {s}
                </span>
              </div>
            );
          })}
          <button
            className="bc-btn bc-btn-ghost bc-btn-sm"
            style={{ marginTop: 12 }}
            onClick={() => setActiveTab("documents")}
          >
            Review documents vault
          </button>
        </div>
      )}

      <div className="bc-grid bc-grid-4" style={{ marginBottom: 20 }}>
        <StatCard label="Total balance" value={INR(allBalance)} icon={<Wallet size={16} />} tint="var(--teal-light)" textColor="var(--teal)" />
        <StatCard label="Income this month" value={INR(income)} icon={<TrendingUp size={16} />} tint="var(--teal-light)" textColor="var(--teal)" />
        <StatCard label="Expenses this month" value={INR(expense)} icon={<TrendingDown size={16} />} tint="var(--brick-light)" textColor="var(--brick)" />
        <StatCard label="Invoices outstanding" value={dueInvoices.length} icon={<FileText size={16} />} tint="#F1E6D2" textColor="var(--brass-dark)" />
      </div>

      <div className="bc-grid bc-grid-2" style={{ alignItems: "start" }}>
        <div className="bc-card">
          <p className="bc-section-title">Income vs Expenses — Last 6 Months</p>
          <div style={{ height: 230, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="var(--paper-line)" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={{ stroke: "var(--paper-line)" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => (v >= 1000 ? (v / 1000) + "k" : v)} />
                <Tooltip formatter={(v) => [INR(v), ""]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--paper-line)", background: "#FAFAF3" }} />
                <Bar dataKey="Income" fill="#2F6F62" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Expenses" fill="#A63D2F" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bc-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p className="bc-section-title" style={{ margin: 0 }}>Open Tasks</p>
            <span style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>{openTodos.length} pending</span>
          </div>
          {openTodos.length === 0 ? (
            <EmptyState title="All clear" body="Nothing pending on your to-do list." />
          ) : (
            openTodos.slice(0, 5).map((t) => (
              <div key={t.id} className="bc-ledger-row">
                <span style={{ flex: 1 }}>{t.text}</span>
                <span className="bc-tag" style={{ color: PRIORITY_STYLES[t.priority]?.color, background: "transparent" }}>
                  {PRIORITY_STYLES[t.priority]?.label}
                </span>
              </div>
            ))
          )}
          {data.todos.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <button className="bc-btn bc-btn-ghost bc-btn-sm" onClick={() => setActiveTab("todos")}>
                View all tasks
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bc-card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p className="bc-section-title" style={{ margin: 0 }}>Recent Ledger Entries</p>
          <button className="bc-btn bc-btn-ghost bc-btn-sm" onClick={() => setActiveTab("ledger")}>
            Full Ledger
          </button>
        </div>
        {recentTx.length === 0 ? (
          <EmptyState title="No entries yet" body="Add your first transaction to start the ledger." />
        ) : (
          recentTx.map((t) => (
            <div key={t.id} className="bc-ledger-row">
              <span style={{ color: "var(--ink-soft)", fontFamily: "IBM Plex Mono, monospace", fontSize: 12, width: 85 }}>{t.date}</span>
              <span style={{ width: 140, fontWeight: 500 }}>{t.category}</span>
              <span style={{ color: "var(--ink-soft)", flex: 1, fontSize: 12.5 }}>{t.note}</span>
              <span
                className="bc-ledger-amount"
                style={{ color: t.type === "income" ? "var(--teal)" : "var(--brick)" }}
              >
                {t.type === "income" ? "+" : "-"}{INR(t.amount)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
