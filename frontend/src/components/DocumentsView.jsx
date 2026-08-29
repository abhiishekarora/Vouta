import React, { useState } from "react";
import { Plus, Trash2, Search, FileText, AlertTriangle } from "lucide-react";
import { Modal, EmptyState } from "./Modal";
import { todayISO } from "../utils/helpers";
import * as api from "../utils/api";

const DOC_CATEGORIES = [
  "All", "GST Registration", "ROC Filing", "Trade License",
  "Insurance Policy", "MSME/Udyam", "Labour Compliance",
  "IP / Trademark", "Contracts", "Other"
];

export function DocumentsView({ data, refetch }) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", category: DOC_CATEGORIES[1], docNumber: "",
    issueDate: "", expiryDate: "", status: "Filed", notes: "", content: "",
  });

  const addDoc = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.documents.create({
        ...form,
        issueDate: form.issueDate || null,
        expiryDate: form.expiryDate || null,
      });
      await refetch();
      setForm({ title: "", category: DOC_CATEGORIES[1], docNumber: "", issueDate: "", expiryDate: "", status: "Filed", notes: "", content: "" });
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const removeDoc = async (id) => {
    await api.documents.remove(id);
    await refetch();
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
        <button className="bc-btn bc-btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Add Document
        </button>
      </div>

      {expiringSoon.length > 0 && (
        <div className="bc-card" style={{ borderColor: "var(--brass)", background: "var(--brass-light)", marginBottom: 16 }}>
          <p style={{ margin: 0, color: "var(--brass-dark)", fontWeight: 700, fontSize: 14 }}>
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
            <div key={d.id} className="bc-card bc-doc-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <FileText size={18} style={{ color: "var(--sidebar)", marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14.5 }}>{d.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-soft)" }}>
                      {d.category}{d.docNumber ? ` · ${d.docNumber}` : ""}
                      {d.issueDate ? ` · Issued ${d.issueDate}` : ""}
                    </p>
                    {d.expiryDate && (
                      <p style={{ margin: "3px 0 0", fontSize: 12, fontWeight: 700, color: daysLeft !== null && daysLeft <= 30 ? "var(--brick)" : daysLeft !== null && daysLeft <= 60 ? "var(--brass)" : "var(--ink-soft)" }}>
                        {daysLeft !== null && daysLeft >= 0
                          ? `Expires in ${daysLeft} days (${d.expiryDate})`
                          : `Expired on ${d.expiryDate}`}
                      </p>
                    )}
                  </div>
                </div>
                <button className="bc-icon-btn" onClick={() => removeDoc(d.id)} aria-label="Delete document">
                  <Trash2 size={14} />
                </button>
              </div>
              {d.notes && <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--ink-soft)" }}>{d.notes}</p>}
            </div>
          );
        })
      )}

      {showModal && (
        <Modal title="Add Document" onClose={() => setShowModal(false)}>
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
          <button className="bc-btn bc-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={addDoc} disabled={saving}>
            {saving ? "Saving…" : "Save Document"}
          </button>
        </Modal>
      )}
    </div>
  );
}
