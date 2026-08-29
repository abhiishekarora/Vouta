import React, { useState } from "react";
import { Plus, Trash2, Eye, CheckCircle2, Target, Calendar, Hammer, DollarSign } from "lucide-react";
import { Modal, EmptyState } from "./Modal";
import { INR } from "../utils/helpers";
import * as api from "../utils/api";

const CATEGORIES = [
  { id: "financial", label: "Financial", icon: <DollarSign size={14} />, color: "#10B981" },
  { id: "milestone", label: "Milestone", icon: <Target size={14} />, color: "#8B5CF6" },
  { id: "deadline", label: "Deadline", icon: <Calendar size={14} />, color: "#3B82F6" },
  { id: "build", label: "Build", icon: <Hammer size={14} />, color: "#F59E0B" },
];

function getCat(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
}

export function GoalsView({ data, refetch, userRole = "admin" }) {
  const [showModal, setShowModal] = useState(false);
  const [contributingId, setContributingId] = useState(null);
  const [contribAmount, setContribAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    title: "", category: "financial", targetAmount: "", currentAmount: "", deadline: "", note: "",
  });

  const canEdit = userRole !== "view";

  const addGoal = async () => {
    if (!form.title.trim()) return;
    if (form.category === "financial" && !form.targetAmount) return;
    setSaving(true);
    try {
      await api.goals.create({
        title: form.title.trim(),
        category: form.category,
        targetAmount: form.category === "financial" ? Number(form.targetAmount) : null,
        currentAmount: form.category === "financial" ? (Number(form.currentAmount) || 0) : 0,
        deadline: form.deadline || null,
        note: form.note.trim(),
      });
      await refetch();
      setForm({ title: "", category: "financial", targetAmount: "", currentAmount: "", deadline: "", note: "" });
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const removeGoal = async (id) => {
    await api.goals.remove(id);
    await refetch();
  };

  const toggleComplete = async (goal) => {
    const newStatus = goal.status === "completed" ? "active" : "completed";
    await api.goals.update(goal.id, { status: newStatus });
    await refetch();
  };

  const contribute = async (id) => {
    const amt = Number(contribAmount);
    if (!amt) return;
    const goal = data.goals.find((g) => g.id === id);
    if (!goal) return;
    await api.goals.update(id, { currentAmount: (goal.currentAmount || 0) + amt });
    await refetch();
    setContribAmount("");
    setContributingId(null);
  };

  const filtered = data.goals.filter((g) => {
    if (filter === "all") return true;
    if (filter === "active") return g.status !== "completed";
    if (filter === "completed") return g.status === "completed";
    return g.category === filter;
  });

  return (
    <div>
      <div className="bc-topbar">
        <div>
          <h1 className="bc-page-title">Goals</h1>
          <p className="bc-page-sub">Financial targets, milestones, deadlines, and things to build.</p>
        </div>
        {canEdit ? (
          <button className="bc-btn bc-btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> New Goal
          </button>
        ) : (
          <span className="bc-role-badge view" style={{ padding: "6px 12px", fontSize: 12 }}>
            <Eye size={13} style={{ marginRight: 4, verticalAlign: "middle" }} /> Read-Only View
          </span>
        )}
      </div>

      {/* Filter Chips */}
      <div className="bc-tab-list">
        {[
          { id: "all", label: "All" },
          { id: "active", label: "Active" },
          { id: "completed", label: "Completed" },
          ...CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
        ].map((f) => (
          <button
            key={f.id}
            className={`bc-filter-chip ${filter === f.id ? "active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bc-card">
          <EmptyState
            title="No goals found"
            body={filter === "all" ? "Set your first goal to track progress." : `No ${filter} goals yet.`}
            action={
              canEdit ? (
                <button className="bc-btn bc-btn-primary" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>
                  <Plus size={15} /> Create Goal
                </button>
              ) : null
            }
          />
        </div>
      ) : (
        filtered.map((g) => {
          const cat = getCat(g.category);
          const isFinancial = g.category === "financial" && g.targetAmount;
          const pct = isFinancial ? Math.min(100, Math.round(((g.currentAmount || 0) / g.targetAmount) * 100)) : null;
          const isCompleted = g.status === "completed";

          return (
            <div key={g.id} className="bc-card bc-goal-card" style={{ opacity: isCompleted ? 0.65 : 1 }}>
              <div className="bc-goal-top">
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 0 }}>
                  {/* Category icon */}
                  <div style={{
                    width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                    background: `${cat.color}18`, color: cat.color, flexShrink: 0, marginTop: 2,
                  }}>
                    {cat.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="bc-goal-title" style={{ textDecoration: isCompleted ? "line-through" : "none" }}>
                      {g.title}
                    </p>
                    <p className="bc-goal-meta">
                      <span className="bc-tag" style={{
                        background: `${cat.color}18`, color: cat.color, border: `1px solid ${cat.color}30`,
                        fontSize: 10, padding: "2px 7px", marginRight: 8,
                      }}>
                        {cat.label}
                      </span>
                      {isFinancial && (
                        <span>{INR(g.currentAmount || 0)} of {INR(g.targetAmount)}</span>
                      )}
                      {g.deadline && (
                        <span style={{ marginLeft: isFinancial ? 8 : 0 }}>
                          Due: {g.deadline}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  {canEdit && (
                    <>
                      <button
                        className="bc-icon-btn"
                        onClick={() => toggleComplete(g)}
                        title={isCompleted ? "Mark active" : "Mark complete"}
                        style={{ color: isCompleted ? "#10B981" : undefined }}
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <button className="bc-icon-btn" onClick={() => removeGoal(g.id)} aria-label="Delete goal">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Progress bar for financial goals */}
              {isFinancial && (
                <>
                  <div className="bc-progress-track">
                    <div className="bc-progress-fill" style={{ width: pct + "%" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                    <span style={{ fontSize: 12.5, color: "var(--ink-soft)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                      {pct}% Complete
                    </span>
                    {canEdit && !isCompleted && (
                      contributingId === g.id ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            className="bc-input"
                            style={{ width: 120, padding: "5px 8px" }}
                            type="number"
                            placeholder="Amount"
                            value={contribAmount}
                            onChange={(e) => setContribAmount(e.target.value)}
                            autoFocus
                          />
                          <button className="bc-btn bc-btn-primary bc-btn-sm" onClick={() => contribute(g.id)}>Add</button>
                          <button className="bc-btn bc-btn-ghost bc-btn-sm" onClick={() => { setContributingId(null); setContribAmount(""); }}>Cancel</button>
                        </div>
                      ) : (
                        <button className="bc-btn bc-btn-ghost bc-btn-sm" onClick={() => setContributingId(g.id)}>
                          + Add Progress
                        </button>
                      )
                    )}
                  </div>
                </>
              )}

              {g.note && <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 10, marginBottom: 0 }}>{g.note}</p>}
            </div>
          );
        })
      )}

      {/* New Goal Modal */}
      {showModal && canEdit && (
        <Modal title="New Goal" onClose={() => setShowModal(false)}>
          {/* Category picker */}
          <div className="bc-field">
            <label className="bc-label">Goal Type</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`bc-filter-chip ${form.category === c.id ? "active" : ""}`}
                  onClick={() => setForm({ ...form, category: c.id })}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px" }}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bc-field">
            <label className="bc-label">Goal Title</label>
            <input
              className="bc-input"
              placeholder={
                form.category === "financial" ? "e.g. Seed funding runway"
                : form.category === "milestone" ? "e.g. Launch MVP"
                : form.category === "deadline" ? "e.g. File quarterly taxes"
                : "e.g. Build dashboard analytics"
              }
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          {form.category === "financial" && (
            <div className="bc-row-2">
              <div className="bc-field">
                <label className="bc-label">Target Amount</label>
                <input className="bc-input" type="number" placeholder="500000" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} />
              </div>
              <div className="bc-field">
                <label className="bc-label">Current Progress</label>
                <input className="bc-input" type="number" placeholder="0" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} />
              </div>
            </div>
          )}

          <div className="bc-field">
            <label className="bc-label">Deadline (Optional)</label>
            <input className="bc-input" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <div className="bc-field">
            <label className="bc-label">Note (Optional)</label>
            <textarea className="bc-textarea" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <button className="bc-btn bc-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={addGoal} disabled={saving}>
            {saving ? "Saving..." : "Save Goal"}
          </button>
        </Modal>
      )}
    </div>
  );
}
