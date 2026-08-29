import React, { useState } from "react";
import { Plus, Trash2, ChevronRight, Archive, Eye } from "lucide-react";
import { Modal, EmptyState } from "./Modal";
import { PROJECT_STATUSES } from "../utils/helpers";
import * as api from "../utils/api";

const KANBAN_COLS = ["To Do", "In Progress", "Done"];

export function ProjectsView({ data, refetch, userRole = "admin" }) {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: "", label: "Internal", startDate: "", status: "Not Started", description: "" });
  const [taskForm, setTaskForm] = useState({ title: "", assignedTo: "", priority: "medium" });

  const canEdit = userRole !== "view";

  const selectedProject = data.projects.find((p) => p.id === selectedProjectId);
  const tasksForProject = data.projectTasks.filter((t) => t.projectId === selectedProjectId);

  const addProject = async () => {
    if (!projectForm.name.trim()) return;
    setSaving(true);
    try {
      await api.projects.create({ ...projectForm, startDate: projectForm.startDate || null });
      await refetch();
      setProjectForm({ name: "", label: "Internal", startDate: "", status: "Not Started", description: "" });
      setShowProjectModal(false);
    } finally {
      setSaving(false);
    }
  };

  const removeProject = async (id) => {
    await api.projects.remove(id);
    if (selectedProjectId === id) setSelectedProjectId(null);
    await refetch();
  };

  const updateProjectStatus = async (id, status) => {
    await api.projects.updateStatus(id, status);
    await refetch();
  };

  const addTask = async () => {
    if (!taskForm.title.trim() || !selectedProjectId) return;
    setSaving(true);
    try {
      await api.projectTasks.create({
        projectId: selectedProjectId,
        title: taskForm.title.trim(),
        assignedTo: taskForm.assignedTo || null,
        priority: taskForm.priority,
      });
      await refetch();
      setTaskForm({ title: "", assignedTo: "", priority: "medium" });
      setShowTaskModal(false);
    } finally {
      setSaving(false);
    }
  };

  const moveTask = async (taskId, newStatus) => {
    await api.projectTasks.move(taskId, newStatus);
    await refetch();
  };

  const removeTask = async (taskId) => {
    await api.projectTasks.remove(taskId);
    await refetch();
  };

  return (
    <div>
      <div className="bc-topbar">
        <div>
          <h1 className="bc-page-title">Projects</h1>
          <p className="bc-page-sub">Client and internal projects with Kanban task boards.</p>
        </div>
        {canEdit ? (
          <button className="bc-btn bc-btn-primary" onClick={() => setShowProjectModal(true)}>
            <Plus size={15} /> New Project
          </button>
        ) : (
          <span className="bc-role-badge view" style={{ padding: "6px 12px", fontSize: 12 }}>
            <Eye size={13} style={{ marginRight: 4, verticalAlign: "middle" }} /> Read-Only View
          </span>
        )}
      </div>

      {data.projects.length === 0 ? (
        <div className="bc-card">
          <EmptyState title="No projects" body="Create a project and track tasks with the Kanban board." />
        </div>
      ) : (
        <div style={{ display: "flex", gap: 20 }}>
          {/* Project list */}
          <div style={{ width: 280, flexShrink: 0 }}>
            {data.projects.map((p) => (
              <div
                key={p.id}
                className={"bc-card bc-project-item" + (selectedProjectId === p.id ? " selected" : "")}
                onClick={() => setSelectedProjectId(selectedProjectId === p.id ? null : p.id)}
                style={{ cursor: "pointer", marginBottom: 10, borderColor: selectedProjectId === p.id ? "#FFFFFF" : "#27272A" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#FFFFFF" }}>{p.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>{p.label}</p>
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <ChevronRight size={15} style={{ color: "var(--ink-soft)" }} />
                    {canEdit && (
                      <button
                        className="bc-icon-btn"
                        onClick={(e) => { e.stopPropagation(); removeProject(p.id); }}
                        aria-label="Delete project"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <span className="bc-tag">● {p.status}</span>
                </div>
                {selectedProjectId === p.id && canEdit && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                    {PROJECT_STATUSES.filter((s) => s !== p.status).map((s) => (
                      <button
                        key={s}
                        className="bc-btn bc-btn-ghost bc-btn-sm"
                        style={{ fontSize: 11 }}
                        onClick={(e) => { e.stopPropagation(); updateProjectStatus(p.id, s); }}
                      >
                        {s === "Completed" ? <Archive size={11} /> : null} {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Kanban board */}
          {selectedProject && (
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontFamily: "Zilla Slab, serif", fontSize: 20, color: "#FFFFFF" }}>{selectedProject.name}</h2>
                {canEdit && (
                  <button className="bc-btn bc-btn-ghost bc-btn-sm" onClick={() => setShowTaskModal(true)}>
                    <Plus size={13} /> Add Task
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 14 }}>
                {KANBAN_COLS.map((col) => (
                  <div key={col} className="bc-kanban-col">
                    <p className="bc-kanban-col-title">{col}</p>
                    {tasksForProject.filter((t) => t.status === col).map((task) => {
                      const assignee = data.team.find((m) => m.id === task.assignedTo);
                      return (
                        <div key={task.id} className="bc-kanban-card">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#FFFFFF", flex: 1 }}>{task.title}</p>
                            {canEdit && (
                              <button
                                className="bc-icon-btn"
                                onClick={() => removeTask(task.id)}
                                style={{ padding: 2 }}
                                aria-label="Remove task"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                          {assignee && (
                            <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--ink-soft)" }}>
                              👤 {assignee.name}
                            </p>
                          )}
                          {canEdit && (
                            <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                              {KANBAN_COLS.filter((c) => c !== col).map((dest) => (
                                <button key={dest} className="bc-btn bc-btn-ghost bc-btn-sm" style={{ fontSize: 10.5, padding: "2px 7px" }}
                                  onClick={() => moveTask(task.id, dest)}>
                                  → {dest}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {tasksForProject.filter((t) => t.status === col).length === 0 && (
                      <p style={{ fontSize: 12.5, color: "var(--ink-soft)", textAlign: "center", paddingTop: 20 }}>
                        No tasks here
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showProjectModal && canEdit && (
        <Modal title="New Project" onClose={() => setShowProjectModal(false)}>
          <div className="bc-field">
            <label className="bc-label">Project Name</label>
            <input className="bc-input" placeholder="e.g. Brand Refresh 2025" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} autoFocus />
          </div>
          <div className="bc-row-2">
            <div className="bc-field">
              <label className="bc-label">Label</label>
              <select className="bc-select" value={projectForm.label} onChange={(e) => setProjectForm({ ...projectForm, label: e.target.value })}>
                <option>Client</option><option>Internal</option><option>R&D</option><option>Operations</option>
              </select>
            </div>
            <div className="bc-field">
              <label className="bc-label">Start Date</label>
              <input className="bc-input" type="date" value={projectForm.startDate} onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })} />
            </div>
          </div>
          <div className="bc-field">
            <label className="bc-label">Status</label>
            <select className="bc-select" value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}>
              {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="bc-field">
            <label className="bc-label">Description (Optional)</label>
            <textarea className="bc-textarea" rows={2} value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
          </div>
          <button className="bc-btn bc-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={addProject} disabled={saving}>
            {saving ? "Saving…" : "Create Project"}
          </button>
        </Modal>
      )}

      {showTaskModal && canEdit && (
        <Modal title="Add Task" onClose={() => setShowTaskModal(false)}>
          <div className="bc-field">
            <label className="bc-label">Task Title</label>
            <input className="bc-input" placeholder="e.g. Design homepage mockups" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} autoFocus />
          </div>
          <div className="bc-row-2">
            <div className="bc-field">
              <label className="bc-label">Assign to</label>
              <select className="bc-select" value={taskForm.assignedTo} onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}>
                <option value="">— Unassigned —</option>
                {data.team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="bc-field">
              <label className="bc-label">Priority</label>
              <select className="bc-select" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <button className="bc-btn bc-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={addTask} disabled={saving}>
            {saving ? "Saving…" : "Add Task"}
          </button>
        </Modal>
      )}
    </div>
  );
}
