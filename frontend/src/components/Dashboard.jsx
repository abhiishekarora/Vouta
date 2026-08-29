import React, { useMemo } from "react";
import { Wallet, TrendingUp, TrendingDown, FileText, AlertCircle, PieChart as PieIcon } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { StatCard, EmptyState } from "./Modal";
import { INR, monthKey, monthLabel, computeDocStatus } from "../utils/helpers";

const COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#6366F1", "#EC4899", "#14B8A6"];

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

  // Bar Chart Data (Last 6 Months)
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

  // Pie Chart Data: Expense Category Breakdown
  const expenseCategoryPieData = useMemo(() => {
    const expenses = data.transactions.filter((t) => t.type === "expense");
    const map = {};
    expenses.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + Number(t.amount);
    });
    return Object.keys(map).map((cat) => ({
      name: cat,
      value: map[cat],
    })).sort((a, b) => b.value - a.value);
  }, [data.transactions]);

  // Donut Pie Chart Data: Income vs Expense Overall
  const overviewPieData = useMemo(() => {
    const totalInc = data.transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const totalExp = data.transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return [
      { name: "Total Income", value: totalInc, color: "#10B981" },
      { name: "Total Expenses", value: totalExp, color: "#8B5CF6" },
    ].filter((d) => d.value > 0);
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
        <div className="bc-card" style={{ marginBottom: 20, borderColor: "#7C3AED", background: "#F3E8FF" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <AlertCircle size={18} color="#7C3AED" />
            <p className="bc-section-title" style={{ color: "#7C3AED", margin: 0 }}>
              Compliance documents needing attention ({docAlerts.length})
            </p>
          </div>
          {docAlerts.map((d) => {
            const s = computeDocStatus(d);
            return (
              <div key={d.id} className="bc-ledger-row">
                <span style={{ flex: 1, fontWeight: 600, color: "#0F172A" }}>{d.title}</span>
                <span style={{ fontSize: 12, color: "#64748B", fontFamily: "var(--font-mono)" }}>
                  {d.expiryDate ? `Expires ${d.expiryDate}` : "No expiry date"}
                </span>
                <span className="bc-tag">
                  {s}
                </span>
              </div>
            );
          })}
          <button
            className="bc-btn bc-btn-primary bc-btn-sm"
            style={{ marginTop: 12 }}
            onClick={() => setActiveTab("documents")}
          >
            Review documents vault
          </button>
        </div>
      )}

      {/* Vibrant Stat Cards */}
      <div className="bc-grid bc-grid-4" style={{ marginBottom: 20 }}>
        <StatCard label="Total Balance" value={INR(allBalance)} icon={<Wallet size={18} />} tint="#F3E8FF" textColor="#7C3AED" />
        <StatCard label="Income This Month" value={INR(income)} icon={<TrendingUp size={18} />} tint="#ECFDF5" textColor="#059669" />
        <StatCard label="Expenses This Month" value={INR(expense)} icon={<TrendingDown size={18} />} tint="#EFF6FF" textColor="#2563EB" />
        <StatCard label="Invoices Outstanding" value={dueInvoices.length} icon={<FileText size={18} />} tint="#FEF3C7" textColor="#D97706" />
      </div>

      {/* Main Charts Grid: Bar Chart + Expense Pie Chart */}
      <div className="bc-grid bc-grid-2" style={{ alignItems: "start", marginBottom: 20 }}>
        {/* Income vs Expenses Bar Chart */}
        <div className="bc-card">
          <p className="bc-section-title">Income vs Expenses — Last 6 Months</p>
          <div style={{ height: 260, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => (v >= 1000 ? (v / 1000) + "k" : v)} />
                <Tooltip formatter={(v) => [INR(v), ""]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#0F172A" }} />
                <Bar dataKey="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Distribution Pie Chart */}
        <div className="bc-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p className="bc-section-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <PieIcon size={18} color="#8B5CF6" /> Expense Categories Breakdown
            </p>
          </div>
          {expenseCategoryPieData.length === 0 ? (
            <EmptyState title="No expense data" body="Add expenses to see category breakdown." />
          ) : (
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expenseCategoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [INR(val), "Amount"]} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Grid: Tasks + Donut Overview */}
      <div className="bc-grid bc-grid-2" style={{ alignItems: "start" }}>
        {/* Income vs Expense Donut Pie Chart */}
        <div className="bc-card">
          <p className="bc-section-title">Income vs Expense Ratio</p>
          {overviewPieData.length === 0 ? (
            <EmptyState title="No financial data" body="Record transactions to visualize income vs expense ratio." />
          ) : (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overviewPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    dataKey="value"
                  >
                    {overviewPieData.map((entry, index) => (
                      <Cell key={`cell-ov-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [INR(val), "Total"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Open Tasks List */}
        <div className="bc-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p className="bc-section-title" style={{ margin: 0 }}>Open Tasks</p>
            <span style={{ fontSize: 12, color: "#3B82F6", fontWeight: 700 }}>{openTodos.length} pending</span>
          </div>
          {openTodos.length === 0 ? (
            <EmptyState title="All clear" body="Nothing pending on your to-do list." />
          ) : (
            openTodos.slice(0, 4).map((t) => (
              <div key={t.id} className="bc-ledger-row">
                <span style={{ flex: 1, fontWeight: 500, color: "#0F172A" }}>{t.text}</span>
                <span className="bc-tag">
                  {t.priority?.toUpperCase()}
                </span>
              </div>
            ))
          )}
          {data.todos.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <button className="bc-btn bc-btn-ghost bc-btn-sm" onClick={() => setActiveTab("todos")}>
                View all tasks
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Ledger Entries */}
      <div className="bc-card" style={{ marginTop: 18 }}>
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
              <span style={{ color: "#64748B", fontFamily: "var(--font-mono)", fontSize: 12, width: 95 }}>{t.date}</span>
              <span style={{ width: 140, fontWeight: 600, color: "#0F172A" }}>{t.category}</span>
              <span style={{ color: "#64748B", flex: 1, fontSize: 12.5 }}>{t.note}</span>
              <span
                className="bc-ledger-amount"
                style={{ color: t.type === "income" ? "#10B981" : "#8B5CF6" }}
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
