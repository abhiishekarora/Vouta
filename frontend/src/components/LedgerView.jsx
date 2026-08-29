import React, { useState } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, Eye } from "lucide-react";
import { Modal, StatCard, EmptyState } from "./Modal";
import { INR, todayISO, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../utils/helpers";
import * as api from "../utils/api";

export function LedgerView({ data, refetch, userRole = "admin" }) {
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "expense", amount: "", category: EXPENSE_CATEGORIES[0], date: todayISO(), note: "",
  });

  const canEdit = userRole !== "view";

  const addTx = async () => {
    if (!form.amount || !form.category) return;
    setSaving(true);
    try {
      await api.transactions.create({ ...form, amount: Number(form.amount) });
      await refetch();
      setForm({ type: "expense", amount: "", category: EXPENSE_CATEGORIES[0], date: todayISO(), note: "" });
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const removeTx = async (id) => {
    await api.transactions.remove(id);
    await refetch();
  };

  const filtered = data.transactions
    .filter((t) => filter === "all" || t.type === filter)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalIncome  = data.transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = data.transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div>
      <div className="bc-topbar">
        <div>
          <h1 className="bc-page-title">Ledger</h1>
          <p className="bc-page-sub">Comprehensive transaction history of income and expenses.</p>
        </div>
        {canEdit ? (
          <button className="bc-btn bc-btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Add Entry
          </button>
        ) : (
          <span className="bc-role-badge view" style={{ padding: "6px 12px", fontSize: 12 }}>
            <Eye size={13} style={{ marginRight: 4, verticalAlign: "middle" }} /> Read-Only View
          </span>
        )}
      </div>

      <div className="bc-grid bc-grid-2" style={{ marginBottom: 20 }}>
        <StatCard label="Total Income Recorded" value={INR(totalIncome)} icon={<TrendingUp size={16} />} tint="#18181B" textColor="#FFFFFF" />
        <StatCard label="Total Expenses Recorded" value={INR(totalExpense)} icon={<TrendingDown size={16} />} tint="#18181B" textColor="#E4E4E7" />
      </div>

      <div className="bc-tab-list">
        {["all", "income", "expense"].map((f) => (
          <span key={f} className={"bc-filter-chip" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>
            {f === "all" ? "All Entries" : f === "income" ? "Income Only" : "Expenses Only"}
          </span>
        ))}
      </div>

      <div className="bc-card">
        {filtered.length === 0 ? (
          <EmptyState title="No entries found" body="Add your first transaction to populate the ledger." />
        ) : (
          filtered.map((t) => (
            <div key={t.id} className="bc-ledger-row">
              <span style={{ color: "var(--ink-soft)", fontFamily: "IBM Plex Mono, monospace", fontSize: 12, width: 85 }}>{t.date}</span>
              <span style={{ width: 150, fontWeight: 600, color: "#FFFFFF" }}>{t.category}</span>
              <span style={{ color: "var(--ink-soft)", flex: 1 }}>{t.note}</span>
              <span className="bc-ledger-amount" style={{ color: t.type === "income" ? "#FFFFFF" : "#A1A1AA" }}>
                {t.type === "income" ? "+" : "-"}{INR(t.amount)}
              </span>
              {canEdit && (
                <button className="bc-icon-btn" onClick={() => removeTx(t.id)} aria-label="Delete entry">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && canEdit && (
        <Modal title="Add Ledger Entry" onClose={() => setShowModal(false)}>
          <div className="bc-toggle-group">
            <div className={"bc-toggle" + (form.type === "income" ? " active-income" : "")}
              onClick={() => setForm({ ...form, type: "income", category: INCOME_CATEGORIES[0] })}>
              + Income
            </div>
            <div className={"bc-toggle" + (form.type === "expense" ? " active-expense" : "")}
              onClick={() => setForm({ ...form, type: "expense", category: EXPENSE_CATEGORIES[0] })}>
              - Expense
            </div>
          </div>
          <div className="bc-row-2">
            <div className="bc-field">
              <label className="bc-label">Amount (₹)</label>
              <input className="bc-input" type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus />
            </div>
            <div className="bc-field">
              <label className="bc-label">Date</label>
              <input className="bc-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div className="bc-field">
            <label className="bc-label">Category</label>
            <select className="bc-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {(form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="bc-field">
            <label className="bc-label">Note (Optional)</label>
            <input className="bc-input" placeholder="What was this transaction for?" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <button className="bc-btn bc-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={addTx} disabled={saving}>
            {saving ? "Saving…" : "Save Entry"}
          </button>
        </Modal>
      )}
    </div>
  );
}
