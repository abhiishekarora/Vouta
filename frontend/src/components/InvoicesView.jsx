import React, { useState, useRef } from "react";
import { Plus, Trash2, FileText, Clock, CheckCircle2, Eye, Paperclip, Download, X, Upload } from "lucide-react";
import { Modal, EmptyState } from "./Modal";
import { INR, todayISO } from "../utils/helpers";
import * as api from "../utils/api";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE_MB = 5;

export function InvoicesView({ data, refetch, userRole = "admin" }) {
  const [showModal, setShowModal]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [uploading, setUploading]       = useState(null); // invoice id being uploaded
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError]       = useState("");
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    invoiceNo: "", client: "", amount: "", issueDate: todayISO(), dueDate: "", status: "draft", note: "",
  });

  const canEdit = userRole !== "view";

  const addInvoice = async () => {
    if (!form.invoiceNo.trim() || !form.client.trim() || !form.amount) return;
    setSaving(true);
    setFileError("");
    try {
      const inv = await api.invoices.create({ ...form, amount: Number(form.amount), dueDate: form.dueDate || null });

      // Upload file if one was selected in the modal
      if (selectedFile && inv?.id) {
        try {
          await api.invoices.upload(inv.id, selectedFile);
        } catch (uploadErr) {
          setFileError(`Invoice saved, but file upload failed: ${uploadErr.message}`);
        }
      }

      await refetch();
      setForm({ invoiceNo: "", client: "", amount: "", issueDate: todayISO(), dueDate: "", status: "draft", note: "" });
      setSelectedFile(null);
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

  // ── Attach / replace file on existing invoice card
  const handleCardUpload = async (inv, file) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert("Only PDF, JPG, or PNG files are allowed.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`File must be under ${MAX_SIZE_MB}MB.`);
      return;
    }
    setUploading(inv.id);
    try {
      await api.invoices.upload(inv.id, file);
      await refetch();
    } catch (err) {
      alert(err.message || "Upload failed.");
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveFile = async (inv) => {
    if (!canEdit) return;
    if (!confirm(`Remove the attached file from invoice ${inv.invoiceNo}?`)) return;
    try {
      await api.invoices.removeFile(inv.id);
      await refetch();
    } catch (err) {
      alert(err.message || "Failed to remove file.");
    }
  };

  // ── Modal file picker
  const handleModalFileChange = (e) => {
    const file = e.target.files?.[0];
    setFileError("");
    if (!file) { setSelectedFile(null); return; }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError("Only PDF, JPG, or PNG files are allowed.");
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setFileError(`File must be under ${MAX_SIZE_MB}MB.`);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
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
        {canEdit ? (
          <button className="bc-btn bc-btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> New Invoice
          </button>
        ) : (
          <span className="bc-role-badge view" style={{ padding: "6px 12px", fontSize: 12 }}>
            <Eye size={13} style={{ marginRight: 4, verticalAlign: "middle" }} /> Read-Only View
          </span>
        )}
      </div>

      {totalUnpaid > 0 && (
        <div className="bc-card" style={{ background: "var(--amber-light)", borderColor: "var(--amber)", marginBottom: 16 }}>
          <p style={{ margin: 0, color: "var(--ink)", fontWeight: 700, fontSize: 14 }}>
            <Clock size={15} style={{ verticalAlign: "middle", marginRight: 6, color: "var(--amber)" }} />
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
          <div key={inv.id} className="bc-card bc-invoice-card" style={{ marginBottom: 14 }}>
            <div className="bc-invoice-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <FileText size={16} style={{ color: "var(--ink-soft)" }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color: "var(--purple-dark)" }}>
                    {inv.invoiceNo}
                  </span>
                  <span className="bc-status-chip">
                    {inv.status.toUpperCase()}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ink)" }}>{inv.client}</p>
                {inv.dueDate && (
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>Due {inv.dueDate}</p>
                )}
              </div>

              {/* Amount + actions */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--ink)" }}>{INR(inv.amount)}</span>

                {/* View attached file */}
                {inv.hasFile && (
                  <button
                    className="bc-btn bc-btn-ghost bc-btn-sm"
                    onClick={() => api.invoices.viewFile(inv.id, inv.fileName)}
                    title={`View ${inv.fileName}`}
                    style={{ gap: 4 }}
                  >
                    <Download size={13} /> {inv.fileMime === "application/pdf" ? "PDF" : "Image"}
                  </button>
                )}

                {canEdit && (
                  <>
                    {/* Attach / replace file */}
                    <label
                      className="bc-btn bc-btn-ghost bc-btn-sm"
                      title={inv.hasFile ? "Replace attached file" : "Attach PDF/JPG/PNG"}
                      style={{ cursor: "pointer", gap: 4, margin: 0 }}
                    >
                      {uploading === inv.id ? (
                        <span style={{ fontSize: 11 }}>Uploading…</span>
                      ) : (
                        <><Paperclip size={13} /> {inv.hasFile ? "Replace" : "Attach"}</>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: "none" }}
                        disabled={uploading === inv.id}
                        onChange={(e) => handleCardUpload(inv, e.target.files?.[0])}
                      />
                    </label>

                    {/* Remove attached file */}
                    {inv.hasFile && (
                      <button
                        className="bc-icon-btn"
                        onClick={() => handleRemoveFile(inv)}
                        title="Remove attached file"
                        style={{ color: "var(--brick)" }}
                      >
                        <X size={13} />
                      </button>
                    )}

                    <button className="bc-icon-btn" onClick={() => removeInvoice(inv.id)} aria-label="Delete invoice">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* File attachment badge */}
            {inv.hasFile && (
              <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 4 }}>
                <Paperclip size={11} />
                {inv.fileName}
              </p>
            )}

            {canEdit && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {["draft", "sent", "paid", "overdue"].filter((s) => s !== inv.status).map((s) => (
                  <button key={s} className="bc-btn bc-btn-ghost bc-btn-sm" onClick={() => setStatus(inv.id, s)}>
                    {s === "paid" ? <CheckCircle2 size={12} /> : <Clock size={12} />} Mark {s}
                  </button>
                ))}
              </div>
            )}
            {inv.note && <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 8, marginBottom: 0 }}>{inv.note}</p>}
          </div>
        ))
      )}

      {showModal && canEdit && (
        <Modal title="Create Invoice" onClose={() => { setShowModal(false); setSelectedFile(null); setFileError(""); }}>
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

          {/* ── File attachment ── */}
          <div className="bc-field">
            <label className="bc-label">
              Attach Invoice File <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>(PDF, JPG, or PNG — max 5 MB)</span>
            </label>
            <label
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
                border: "1.5px dashed var(--border)", borderRadius: 8, cursor: "pointer",
                background: selectedFile ? "var(--surface-alt)" : "transparent", fontSize: 13,
                color: "var(--ink-soft)", transition: "background 0.15s",
              }}
            >
              <Upload size={15} />
              {selectedFile
                ? <span style={{ color: "var(--ink)", fontWeight: 500 }}>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                : "Click to select or drag a file here"}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: "none" }}
                onChange={handleModalFileChange}
              />
            </label>
            {selectedFile && (
              <button
                type="button"
                style={{ marginTop: 4, fontSize: 12, color: "var(--brick)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              >
                ✕ Remove file
              </button>
            )}
            {fileError && <p className="bc-error-text" style={{ marginTop: 4 }}>{fileError}</p>}
          </div>

          <button className="bc-btn bc-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={addInvoice} disabled={saving}>
            {saving ? "Saving…" : "Create Invoice"}
          </button>
        </Modal>
      )}
    </div>
  );
}
