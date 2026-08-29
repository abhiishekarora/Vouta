import React from "react";
import { X } from "lucide-react";

export function Modal({ title, onClose, children }) {
  return (
    <div className="bc-modal-overlay" onClick={onClose}>
      <div className="bc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bc-modal-head">
          <p className="bc-modal-title">{title}</p>
          <button className="bc-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stamp({ status }) {
  return (
    <span className="bc-status-chip">{status?.toUpperCase()}</span>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="bc-empty">
      <p className="bc-empty-title">{title}</p>
      <p style={{ color: "var(--ink-soft)" }}>{body}</p>
      {action}
    </div>
  );
}

export function StatCard({ label, value, icon, tint, textColor }) {
  return (
    <div className="bc-card">
      <div className="bc-stat-icon" style={{ background: tint || "#09090B", color: textColor || "#FFFFFF" }}>{icon}</div>
      <p className="bc-stat-label">{label}</p>
      <p className="bc-stat-value" style={{ color: "#09090B" }}>{value}</p>
    </div>
  );
}
