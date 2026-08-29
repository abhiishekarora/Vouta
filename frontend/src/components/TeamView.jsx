import React, { useState } from "react";
import { Plus, Trash2, UserCheck, UserX } from "lucide-react";
import { Modal, EmptyState } from "./Modal";
import { DEPARTMENTS } from "../utils/helpers";
import * as api from "../utils/api";

const DEPT_COLORS = {
  Engineering: "#3B82F6", Sales: "#F59E0B", Marketing: "#8B5CF6",
  Design: "#EC4899", Finance: "#10B981", HR: "#6366F1", Operations: "#F97316", Other: "#6B7280",
};

function initials(name) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

export function TeamView({ data, refetch }) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", email: "", department: DEPARTMENTS[0], capacity: "40" });

  const addMember = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    try {
      await api.team.create({ ...form, capacity: Number(form.capacity) || 40 });
      await refetch();
      setForm({ name: "", role: "", email: "", department: DEPARTMENTS[0], capacity: "40" });
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleLeave = async (id) => {
    await api.team.toggleLeave(id);
    await refetch();
  };

  const removeMember = async (id) => {
    await api.team.remove(id);
    await refetch();
  };

  const active  = data.team.filter((m) => !m.onLeave);
  const onLeave = data.team.filter((m) => m.onLeave);

  return (
    <div>
      <div className="bc-topbar">
        <div>
          <h1 className="bc-page-title">Team</h1>
          <p className="bc-page-sub">{active.length} active · {onLeave.length} on leave</p>
        </div>
        <button className="bc-btn bc-btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Add Member
        </button>
      </div>

      {data.team.length === 0 ? (
        <div className="bc-card">
          <EmptyState title="No team members" body="Add team members to track capacity, roles, and assignments." />
        </div>
      ) : (
        <div className="bc-grid bc-grid-3">
          {data.team.map((m) => (
            <div key={m.id} className={"bc-card bc-member-card" + (m.onLeave ? " on-leave" : "")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div className="bc-avatar" style={{ background: DEPT_COLORS[m.department] || "#6B7280" }}>
                    {initials(m.name)}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14.5 }}>{m.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-soft)" }}>{m.role || "—"}</p>
                  </div>
                </div>
                <button className="bc-icon-btn" onClick={() => removeMember(m.id)} aria-label="Remove member">
                  <Trash2 size={14} />
                </button>
              </div>

              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span className="bc-tag" style={{ background: DEPT_COLORS[m.department] + "22", color: DEPT_COLORS[m.department] }}>
                  {m.department}
                </span>
                <span className="bc-tag">{m.capacity}h/wk capacity</span>
              </div>

              <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>{m.email}</p>

              <div style={{ marginTop: 12 }}>
                <button
                  className={"bc-btn bc-btn-sm " + (m.onLeave ? "bc-btn-primary" : "bc-btn-ghost")}
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => toggleLeave(m.id)}
                >
                  {m.onLeave ? (<><UserCheck size={13} /> Mark Active</>) : (<><UserX size={13} /> Set On Leave</>)}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Add Team Member" onClose={() => setShowModal(false)}>
          <div className="bc-row-2">
            <div className="bc-field">
              <label className="bc-label">Full Name</label>
              <input className="bc-input" placeholder="Riya Patel" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </div>
            <div className="bc-field">
              <label className="bc-label">Role / Designation</label>
              <input className="bc-input" placeholder="Software Engineer" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            </div>
          </div>
          <div className="bc-field">
            <label className="bc-label">Work Email</label>
            <input className="bc-input" type="email" placeholder="riya@company.in" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="bc-row-2">
            <div className="bc-field">
              <label className="bc-label">Department</label>
              <select className="bc-select" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="bc-field">
              <label className="bc-label">Capacity (hrs/week)</label>
              <input className="bc-input" type="number" min="0" max="168" placeholder="40" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>
          </div>
          <button className="bc-btn bc-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={addMember} disabled={saving}>
            {saving ? "Saving…" : "Add Member"}
          </button>
        </Modal>
      )}
    </div>
  );
}
