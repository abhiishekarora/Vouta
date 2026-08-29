import React, { useState } from "react";
import { Plus, Trash2, FileText, Clock, CheckCircle2 } from "lucide-react";
import { Modal, EmptyState } from "./Modal";
import { INR, todayISO } from "../utils/helpers";
import * as api from "../utils/api";

const STATUS_COLORS = {
  draft: "var(--ink-soft)",
  sent: "var(--brass)",
  paid: "var(--teal)",
  overdue: "var(--brick)",
};

export function InvoicesView({ data, refetch }) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    invoiceNo: "", client: "", amount: "", issueDate: todayISO(), dueDate: "", status: "draft", note: "",
  });

  const addInvoice = async () => {
    if (!form.invoiceNo.trim() || !form.client.trim() || !form.amount) return;
    setSaving(true);
    try {
      await api.invoices.create({ ...form, amount: Number(form.amount), dueDate: form.dueDate || null });
      await refetch();
      setForm({ invoiceNo: "", client: "", amount: "", issueDate: todayISO(), dueDate: "", status: "draft", note: "" });
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id, status) => {
    await api.invoices.updateStatus(id, status);
    await refetch();
  };

  const removeInvoice = async (id) => {
    await api.invoices.remove(id);
    await refetch();
  };

  const totalUnpaid = data.invoices
    .filter((i) => i.status === "sent" || i.status === "draft")
    .reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div>
      <div className="bc-topbar">
        <div>
          <h1 className="bc-page-title">Invoices</h1>
          <p className="bc-page-sub">Issue and track GST-compliant invoices and payment status.</p>
        </div>
        <button className="bc-btn bc-btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> New Invoice
        </button>
      </div>

      {totalUnpaid > 0 && (
        <div className="bc-card" style={{ background: "var(--teal-light)", borderColor: "var(--teal)", marginBottom: 16 }}>
          <p style={{ margin: 0, color: "var(--teal)", fontWeight: 700, fontSize: 15 }}>
            <Clock size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />
            {INR(totalUnpaid)} outstanding in draft / sent invoices
          </p>
        </div>
      )}

      {data.invoices.length === 0 ? (
        <div className="bc-card">
          <EmptyState title="No invoices yet" body="Create your first invoice to start tracking receivables." />
        </div>
      ) : (
        data.invoices.map((inv) => (
          <div key={inv.id} className="bc-card bc-invoice-card">
            <div className="bc-invoice-header">
              <div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <FileText size={16} style={{ color: "var(--ink-soft)" }} />
                  <span style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, fontSize: 13 }}>
                    {inv.invoiceNo}
                  </span>
                  <span className="bc-status-chip" style={{ color: STATUS_COLORS[inv.status], borderColor: STATUS_COLORS[inv.status] }}>
                    {inv.status.toUpperCase()}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 14 }}>{inv.client}</p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "IBM Plex Mono, monospace" }}>{INR(inv.amount)}</span>
                <button className="bc-icon-btn" onClick={() => removeInvoice(inv.id)} aria-label="Delete invoice">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {["draft", "sent", "paid", "overdue"].filter((s) => s !== inv.status).map((s) => (
                <button key={s} className="bc-btn bc-btn-ghost bc-btn-sm" onClick={() => setStatus(inv.id, s)}>
                  {s === "paid" ? <CheckCircle2 size={12} /> : <Clock size={12} />} Mark {s}
                </button>
              ))}
            </div>
            {inv.note && <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 8, marginBottom: 0 }}>{inv.note}</p>}
          </div>
        ))
      )}

      {showModal && (
        <Modal title="Create Invoice" onClose={() => setShowModal(false)}>
          <div className="bc-row-2">
            <div className="bc-field">
              <label className="bc-label">Invoice Number</label>
              <input className="bc-input" placeholder="INV-001" value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} autoFocus />
            </div>
            <div className="bc-field">
              <label className="bc-label">Client / Payer</label>
              <input className="bc-input" placeholder="Acme Corp" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
            </div>
          </div>
          <div className="bc-row-2">
            <div className="bc-field">
              <label className="bc-label">Amount (₹)</label>
              <input className="bc-input" type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="bc-field">
              <label className="bc-label">Issue Date</label>
              <input className="bc-input" type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
            </div>
          </div>
          <div className="bc-row-2">
            <div className="bc-field">
              <label className="bc-label">Due Date (Optional)</label>
              <input className="bc-input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="bc-field">
              <label className="bc-label">Status</label>
              <select className="bc-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {["draft", "sent", "paid", "overdue"].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="bc-field">
            <label className="bc-label">Note (Optional)</label>
            <input className="bc-input" placeholder="Project name or description" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <button className="bc-btn bc-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={addInvoice} disabled={saving}>
            {saving ? "Saving…" : "Create Invoice"}
          </button>
        </Modal>
      )}
    </div>
  );
}
