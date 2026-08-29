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
  const STAMP_STYLES = {
    paid: { label: "Paid", color: "var(--teal)" },
    sent: { label: "Sent", color: "var(--brass)" },
    draft: { label: "Draft", color: "var(--ink-soft)" },
    overdue: { label: "Overdue", color: "var(--brick)" },
  };
  const s = STAMP_STYLES[status] || STAMP_STYLES.draft;
  return (
    <span className="bc-stamp" style={{ color: s.color }}>{s.label}</span>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="bc-empty">
      <p className="bc-empty-title">{title}</p>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function StatCard({ label, value, icon, tint, textColor }) {
  return (
    <div className="bc-card">
      <div className="bc-stat-icon" style={{ background: tint, color: textColor }}>{icon}</div>
      <p className="bc-stat-label">{label}</p>
      <p className="bc-stat-value" style={{ color: textColor || "var(--ink)" }}>{value}</p>
    </div>
  );
}
