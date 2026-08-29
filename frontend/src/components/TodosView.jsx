import React, { useState } from "react";
import { Plus, Trash2, Check, Eye } from "lucide-react";
import { Modal, EmptyState } from "./Modal";
import { todayISO, PRIORITY_COLORS } from "../utils/helpers";
import * as api from "../utils/api";

export function TodosView({ data, refetch, userRole = "admin" }) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ text: "", priority: "medium", dueDate: "" });

  const canEdit = userRole !== "view";

  const addTodo = async () => {
    if (!form.text.trim()) return;
    setSaving(true);
    try {
      await api.todos.create({ text: form.text.trim(), priority: form.priority, dueDate: form.dueDate || null });
      await refetch();
      setForm({ text: "", priority: "medium", dueDate: "" });
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleTodo = async (id) => {
    if (!canEdit) return;
    await api.todos.toggle(id);
    await refetch();
  };

  const removeTodo = async (id) => {
    if (!canEdit) return;
    await api.todos.remove(id);
    await refetch();
  };

  const pending   = data.todos.filter((t) => !t.done);
  const completed = data.todos.filter((t) => t.done);

  return (
    <div>
      <div className="bc-topbar">
        <div>
          <h1 className="bc-page-title">Action Items</h1>
          <p className="bc-page-sub">{pending.length} pending · {completed.length} completed</p>
        </div>
        {canEdit ? (
          <button className="bc-btn bc-btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> New Task
          </button>
        ) : (
          <span className="bc-role-badge view" style={{ padding: "6px 12px", fontSize: 12 }}>
            <Eye size={13} style={{ marginRight: 4, verticalAlign: "middle" }} /> Read-Only View
          </span>
        )}
      </div>

      {data.todos.length === 0 ? (
        <div className="bc-card">
          <EmptyState title="No tasks" body="Add action items to track important business follow-ups." />
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="bc-card" style={{ marginBottom: 16 }}>
              {pending.map((t) => <TodoRow key={t.id} todo={t} onToggle={toggleTodo} onDelete={removeTodo} canEdit={canEdit} />)}
            </div>
          )}
          {completed.length > 0 && (
            <>
              <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-soft)", textTransform: "uppercase", marginBottom: 6 }}>
                Completed
              </p>
              <div className="bc-card">
                {completed.map((t) => <TodoRow key={t.id} todo={t} onToggle={toggleTodo} onDelete={removeTodo} canEdit={canEdit} />)}
              </div>
            </>
          )}
        </>
      )}

      {showModal && canEdit && (
        <Modal title="Add Action Item" onClose={() => setShowModal(false)}>
          <div className="bc-field">
            <label className="bc-label">Task Description</label>
            <input className="bc-input" placeholder="e.g. File Q4 GST returns" value={form.text} autoFocus onChange={(e) => setForm({ ...form, text: e.target.value })} />
          </div>
          <div className="bc-row-2">
            <div className="bc-field">
              <label className="bc-label">Priority</label>
              <select className="bc-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
            <div className="bc-field">
              <label className="bc-label">Due Date (Optional)</label>
              <input className="bc-input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <button className="bc-btn bc-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={addTodo} disabled={saving}>
            {saving ? "Saving…" : "Add Task"}
          </button>
        </Modal>
      )}
    </div>
  );
}

function TodoRow({ todo, onToggle, onDelete, canEdit }) {
  return (
    <div className={"bc-todo-row" + (todo.done ? " done" : "")}>
      <button className={"bc-check" + (todo.done ? " checked" : "")} onClick={() => onToggle(todo.id)} disabled={!canEdit} aria-label="Toggle task">
        {todo.done && <Check size={11} />}
      </button>
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 500, textDecoration: todo.done ? "line-through" : "none", color: todo.done ? "var(--ink-soft)" : "var(--ink)" }}>
          {todo.text}
        </span>
        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--purple-dark)" }}>
            ● {todo.priority?.toUpperCase()}
          </span>
          {todo.dueDate && <span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>Due {todo.dueDate}</span>}
        </div>
      </div>
      {canEdit && (
        <button className="bc-icon-btn" onClick={() => onDelete(todo.id)} aria-label="Delete task">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
