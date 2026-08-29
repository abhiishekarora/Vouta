import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal, EmptyState } from "./Modal";
import { INR } from "../utils/helpers";
import * as api from "../utils/api";

export function GoalsView({ data, refetch }) {
  const [showModal, setShowModal] = useState(false);
  const [contributingId, setContributingId] = useState(null);
  const [contribAmount, setContribAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", targetAmount: "", currentAmount: "", deadline: "", note: "" });

  const addGoal = async () => {
    if (!form.title.trim() || !form.targetAmount) return;
    setSaving(true);
    try {
      await api.goals.create({
        title: form.title.trim(),
        targetAmount: Number(form.targetAmount),
        currentAmount: Number(form.currentAmount) || 0,
        deadline: form.deadline || null,
        note: form.note.trim(),
      });
      await refetch();
      setForm({ title: "", targetAmount: "", currentAmount: "", deadline: "", note: "" });
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const removeGoal = async (id) => {
    await api.goals.remove(id);
    await refetch();
  };

  const contribute = async (id) => {
    const amt = Number(contribAmount);
    if (!amt) return;
    const goal = data.goals.find((g) => g.id === id);
    if (!goal) return;
    await api.goals.update(id, { currentAmount: goal.currentAmount + amt });
    await refetch();
    setContribAmount("");
    setContributingId(null);
  };

  return (
    <div>
      <div className="bc-topbar">
        <div>
          <h1 className="bc-page-title">Goals</h1>
          <p className="bc-page-sub">Financial targets, runway goals, and revenue milestones.</p>
        </div>
        <button className="bc-btn bc-btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> New Goal
        </button>
      </div>

      {data.goals.length === 0 ? (
        <div className="bc-card">
          <EmptyState
            title="Set your first goal"
            body="Track savings targets, funding milestones, or revenue targets here."
            action={
              <button className="bc-btn bc-btn-primary" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>
                <Plus size={15} /> Create Goal
              </button>
            }
          />
        </div>
      ) : (
        data.goals.map((g) => {
          const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
          return (
            <div key={g.id} className="bc-card bc-goal-card">
              <div className="bc-goal-top">
                <div>
                  <p className="bc-goal-title">{g.title}</p>
                  <p className="bc-goal-meta">
                    {INR(g.currentAmount)} raised of {INR(g.targetAmount)} target
                    {g.deadline ? ` · Target Date: ${g.deadline}` : ""}
                  </p>
                </div>
                <button className="bc-icon-btn" onClick={() => removeGoal(g.id)} aria-label="Delete goal">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="bc-progress-track">
                <div className="bc-progress-fill" style={{ width: pct + "%" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <span style={{ fontSize: 12.5, color: "var(--ink-soft)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 600 }}>
                  {pct}% Completed
                </span>
                {contributingId === g.id ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      className="bc-input"
                      style={{ width: 120, padding: "5px 8px" }}
                      type="number"
                      placeholder="Amount (₹)"
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
                )}
              </div>
              {g.note && <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 10, marginBottom: 0 }}>{g.note}</p>}
            </div>
          );
        })
      )}

      {showModal && (
        <Modal title="New Financial Goal" onClose={() => setShowModal(false)}>
          <div className="bc-field">
            <label className="bc-label">Goal Title</label>
            <input className="bc-input" placeholder="e.g. Seed runway / Software equipment" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="bc-row-2">
            <div className="bc-field">
              <label className="bc-label">Target Amount (₹)</label>
              <input className="bc-input" type="number" placeholder="500000" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} />
            </div>
            <div className="bc-field">
              <label className="bc-label">Already Saved (₹)</label>
              <input className="bc-input" type="number" placeholder="0" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} />
            </div>
          </div>
          <div className="bc-field">
            <label className="bc-label">Target Deadline (Optional)</label>
            <input className="bc-input" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <div className="bc-field">
            <label className="bc-label">Note (Optional)</label>
            <textarea className="bc-textarea" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <button className="bc-btn bc-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={addGoal} disabled={saving}>
            {saving ? "Saving…" : "Save Goal"}
          </button>
        </Modal>
      )}
    </div>
  );
}
