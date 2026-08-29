import React, { useState } from "react";
import { Save } from "lucide-react";
import { BUSINESS_TYPES } from "../utils/helpers";
import * as api from "../utils/api";

export function SettingsView({ currentUser, setCurrentUser }) {
  const [form, setForm] = useState({
    ownerName: currentUser?.ownerName ?? "",
    businessName: currentUser?.businessName ?? "",
    businessType: currentUser?.businessType ?? BUSINESS_TYPES[0],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!form.ownerName.trim() || !form.businessName.trim()) {
      setError("Name fields are required.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await api.auth.profile(form);
      setCurrentUser(res.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="bc-topbar">
        <div>
          <h1 className="bc-page-title">Settings</h1>
          <p className="bc-page-sub">Update your business profile and preferences.</p>
        </div>
      </div>

      <div className="bc-card" style={{ maxWidth: 560 }}>
        {error && <p className="bc-error-text">{error}</p>}
        {saved && (
          <p style={{ color: "var(--teal)", fontWeight: 700, marginBottom: 12, marginTop: 0, fontSize: 14 }}>
            ✔ Settings saved successfully.
          </p>
        )}

        <div className="bc-field">
          <label className="bc-label">Owner / Director Name</label>
          <input className="bc-input" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
        </div>
        <div className="bc-field">
          <label className="bc-label">Company / Entity Name</label>
          <input className="bc-input" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
        </div>
        <div className="bc-field">
          <label className="bc-label">Business Constitution</label>
          <select className="bc-select" value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })}>
            {BUSINESS_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 4 }}>
          <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "var(--ink-soft)" }}>
            Account email: <strong>{currentUser?.email}</strong>
            &ensp;·&ensp;Member since {currentUser?.createdAt?.slice(0, 10)}
          </p>
        </div>

        <button className="bc-btn bc-btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop: 8 }}>
          <Save size={15} />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
