import React, { useState, useRef } from "react";
import { Plus, Trash2, Search, FileText, AlertTriangle, Eye, Paperclip, Download, X, Upload } from "lucide-react";
import { Modal, EmptyState } from "./Modal";
import { todayISO } from "../utils/helpers";
import * as api from "../utils/api";

const DOC_CATEGORIES = [
  "All", "GST Registration", "ROC Filing", "Trade License",
  "Insurance Policy", "MSME/Udyam", "Labour Compliance",
  "IP / Trademark", "Contracts", "Other"
];

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE_MB = 5;

export function DocumentsView({ data, refetch, userRole = "admin" }) {
  const [showModal, setShowModal]     = useState(false);
  const [search, setSearch]           = useState("");
  const [category, setCategory]       = useState("All");
  const [saving, setSaving]           = useState(false);
  const [uploading, setUploading]     = useState(null); // doc id being uploaded
  const [fileError, setFileError]     = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: "", category: DOC_CATEGORIES[1], docNumber: "",
    issueDate: "", expiryDate: "", status: "Filed", notes: "", content: "",
  });

  const canEdit = userRole !== "view";

  // ── Create document (metadata only; file uploaded separately after save)
  const addDoc = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    setFileError("");
    try {
      const doc = await api.documents.create({
        ...form,
        issueDate: form.issueDate || null,
        expiryDate: form.expiryDate || null,
      });

      // If a file was selected in the modal, upload it straight away
      if (selectedFile && doc?.id) {
        try {
          await api.documents.upload(doc.id, selectedFile);
        } catch (uploadErr) {
          setFileError(`Document saved, but file upload failed: ${uploadErr.message}`);
        }
      }

      await refetch();
      setForm({ title: "", category: DOC_CATEGORIES[1], docNumber: "", issueDate: "", expiryDate: "", status: "Filed", notes: "", content: "" });
      setSelectedFile(null);
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const removeDoc = async (id) => {
    if (!canEdit) return;
    await api.documents.remove(id);
    await refetch();
  };

  // ── Attach / replace file on existing document card
  const handleCardUpload = async (doc, file) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert("Only PDF, JPG, or PNG files are allowed.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`File must be under ${MAX_SIZE_MB}MB.`);
      return;
    }
    setUploading(doc.id);
    try {
      await api.documents.upload(doc.id, file);
      await refetch();
    } catch (err) {
      alert(err.message || "Upload failed.");
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveFile = async (doc) => {
    if (!canEdit) return;
    if (!confirm(`Remove the attached file from "${doc.title}"?`)) return;
    try {
      await api.documents.removeFile(doc.id);
      await refetch();
    } catch (err) {
      alert(err.message || "Failed to remove file.");
    }
  };

  // ── Modal file selection
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

  const today = todayISO();
  const filtered = data.documents.filter((d) => {
    const matchCat = category === "All" || d.category === category;
    const q = search.toLowerCase();
    const matchSearch = !q || [d.title, d.docNumber, d.notes, d.content]
      .some((f) => f?.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const expiringSoon = data.documents.filter((d) => {
    if (!d.expiryDate) return false;
    const days = (new Date(d.expiryDate) - new Date(today)) / 86400000;
    return days >= 0 && days <= 60;
  });

  return (
    <div>
      <div className="bc-topbar">
        <div>
          <h1 className="bc-page-title">Compliance Vault</h1>
          <p className="bc-page-sub">Track business registrations, filings, and legal documents.</p>
        </div>
        {canEdit ? (
          <button className="bc-btn bc-btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Add Document
          </button>
        ) : (
          <span className="bc-role-badge view" style={{ padding: "6px 12px", fontSize: 12 }}>
            <Eye size={13} style={{ marginRight: 4, verticalAlign: "middle" }} /> Read-Only View
          </span>
        )}
      </div>

      {expiringSoon.length > 0 && (
        <div className="bc-card" style={{ borderColor: "#FCA5A5", background: "#FEF2F2", marginBottom: 16 }}>
          <p style={{ margin: 0, color: "#EF4444", fontWeight: 700, fontSize: 14 }}>
            <AlertTriangle size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />
            {expiringSoon.length} document{expiringSoon.length > 1 ? "s" : ""} expiring within 60 days:
            {" "}{expiringSoon.map((d) => d.title).join(", ")}
          </p>
        </div>
      )}

      {/* Search & filter bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <input
            className="bc-input"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 34 }}
          />
          <Search size={15} style={{ position: "absolute", left: 10, top: 12, color: "var(--ink-soft)" }} />
        </div>
        <select className="bc-select" style={{ flex: "0 0 auto", width: "auto" }} value={category} onChange={(e) => setCategory(e.target.value)}>
          {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bc-card">
          <EmptyState title="No documents found" body="Add your business registrations, GST certificates, and compliance documents." />
        </div>
      ) : (
        filtered.map((d) => {
          const daysLeft = d.expiryDate
            ? Math.round((new Date(d.expiryDate) - new Date(today)) / 86400000)
            : null;
          return (
            <div key={d.id} className="bc-card bc-doc-card" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <FileText size={18} style={{ color: "var(--purple)", marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14.5, color: "var(--ink)" }}>{d.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-soft)" }}>
                      {d.category}{d.docNumber ? ` · ${d.docNumber}` : ""}
                      {d.issueDate ? ` · Issued ${d.issueDate}` : ""}
                    </p>
                    {d.expiryDate && (
                      <p style={{ margin: "3px 0 0", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>
                        {daysLeft !== null && daysLeft >= 0
                          ? `Expires in ${daysLeft} days (${d.expiryDate})`
                          : `Expired on ${d.expiryDate}`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  {/* View/download file */}
                  {d.hasFile && (
                    <button
                      className="bc-btn bc-btn-ghost bc-btn-sm"
                      onClick={() => api.documents.viewFile(d.id, d.fileName)}
                      title={`View ${d.fileName}`}
                      style={{ gap: 4 }}
                    >
                      <Download size={13} /> {d.fileMime === "application/pdf" ? "PDF" : "Image"}
                    </button>
                  )}

                  {/* Upload / replace file */}
                  {canEdit && (
                    <>
                      <label
                        className="bc-btn bc-btn-ghost bc-btn-sm"
                        title={d.hasFile ? "Replace file" : "Attach file (PDF/JPG/PNG)"}
                        style={{ cursor: "pointer", gap: 4, margin: 0 }}
                      >
                        {uploading === d.id ? (
                          <span style={{ fontSize: 11 }}>Uploading…</span>
                        ) : (
                          <><Paperclip size={13} /> {d.hasFile ? "Replace" : "Attach"}</>
                        )}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          style={{ display: "none" }}
                          disabled={uploading === d.id}
                          onChange={(e) => handleCardUpload(d, e.target.files?.[0])}
                        />
                      </label>

                      {/* Remove attached file */}
                      {d.hasFile && (
                        <button
                          className="bc-icon-btn"
                          onClick={() => handleRemoveFile(d)}
                          title="Remove attached file"
                          style={{ color: "var(--brick)" }}
                        >
                          <X size={13} />
                        </button>
                      )}

                      <button className="bc-icon-btn" onClick={() => removeDoc(d.id)} aria-label="Delete document">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* File attachment badge */}
              {d.hasFile && (
                <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Paperclip size={11} />
                  {d.fileName}
                </p>
              )}

              {d.notes && <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--ink-soft)" }}>{d.notes}</p>}
            </div>
          );
        })
      )}

      {showModal && canEdit && (
        <Modal title="Add Document" onClose={() => { setShowModal(false); setSelectedFile(null); setFileError(""); }}>
          <div className="bc-field">
            <label className="bc-label">Document Title</label>
            <input className="bc-input" placeholder="e.g. GST Registration Certificate" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
          </div>
          <div className="bc-row-2">
            <div className="bc-field">
              <label className="bc-label">Category</label>
              <select className="bc-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {DOC_CATEGORIES.slice(1).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="bc-field">
              <label className="bc-label">Document Number</label>
              <input className="bc-input" placeholder="Reg. / Cert. No." value={form.docNumber} onChange={(e) => setForm({ ...form, docNumber: e.target.value })} />
            </div>
          </div>
          <div className="bc-row-2">
            <div className="bc-field">
              <label className="bc-label">Issue Date</label>
              <input className="bc-input" type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
            </div>
            <div className="bc-field">
              <label className="bc-label">Expiry Date</label>
              <input className="bc-input" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
          </div>
          <div className="bc-field">
            <label className="bc-label">Notes</label>
            <textarea className="bc-textarea" rows={2} placeholder="Any relevant details…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          {/* ── File attachment ── */}
          <div className="bc-field">
            <label className="bc-label">
              Attach File <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>(PDF, JPG, or PNG — max 5 MB)</span>
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

          <button className="bc-btn bc-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={addDoc} disabled={saving}>
            {saving ? "Saving…" : "Save Document"}
          </button>
        </Modal>
      )}
    </div>
  );
}
