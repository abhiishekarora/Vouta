import React, { useState, useEffect, useCallback } from "react";
import { Save, UserPlus, Trash2, Shield, Eye, Edit2, ShieldAlert } from "lucide-react";
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

  // Partners / Workspace Members
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("view");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviting, setInviting] = useState(false);

  const isAdmin = (currentUser?.role || "admin").toLowerCase() === "admin";

  const fetchMembers = useCallback(async () => {
    if (!isAdmin) return;
    setMembersLoading(true);
    try {
      const data = await api.auth.getMembers();
      setMembers(data);
    } catch (err) {
      console.error("Failed to load members:", err.message);
    } finally {
      setMembersLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSaveProfile = async () => {
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

  const handleInvitePartner = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteError("");
    setInviteSuccess("");
    setInviting(true);
    try {
      await api.auth.inviteMember({ email: inviteEmail.trim(), role: inviteRole });
      setInviteSuccess(`Partner ${inviteEmail} invited with '${inviteRole.toUpperCase()}' role.`);
      setInviteEmail("");
      setInviteRole("view");
      await fetchMembers();
      setTimeout(() => setInviteSuccess(""), 3000);
    } catch (err) {
      setInviteError(err.message || "Failed to invite partner.");
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (memberId, newRole) => {
    try {
      await api.auth.updateRole(memberId, newRole);
      await fetchMembers();
    } catch (err) {
      alert("Failed to update role: " + err.message);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Are you sure you want to revoke access for this partner?")) return;
    try {
      await api.auth.removeMember(memberId);
      await fetchMembers();
    } catch (err) {
      alert("Failed to revoke partner access: " + err.message);
    }
  };

  return (
    <div style={{ maxWidth: 780 }}>
      <div className="bc-topbar">
        <div>
          <h1 className="bc-page-title">Settings & Access Control</h1>
          <p className="bc-page-sub">Manage entity details, workspace partner invites, and role permissions.</p>
        </div>
      </div>

      <div className="bc-grid bc-grid-2" style={{ alignItems: "start" }}>
        {/* Business Profile */}
        <div className="bc-card">
          <h2 className="bc-section-title">Business Profile</h2>
          {error && <p className="bc-error-text">{error}</p>}
          {saved && (
            <p style={{ color: "#FAFAFA", fontWeight: 700, marginBottom: 12, fontSize: 13 }}>
              ✔ Profile updated successfully.
            </p>
          )}

          <div className="bc-field">
            <label className="bc-label">Owner / Director Name</label>
            <input
              className="bc-input"
              value={form.ownerName}
              onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
              disabled={!isAdmin}
            />
          </div>
          <div className="bc-field">
            <label className="bc-label">Company / Entity Name</label>
            <input
              className="bc-input"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              disabled={!isAdmin}
            />
          </div>
          <div className="bc-field">
            <label className="bc-label">Business Constitution</label>
            <select
              className="bc-select"
              value={form.businessType}
              onChange={(e) => setForm({ ...form, businessType: e.target.value })}
              disabled={!isAdmin}
            >
              {BUSINESS_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div style={{ borderTop: "1px solid #27272A", paddingTop: 14, marginTop: 14 }}>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)" }}>
              Signed in as: <strong>{currentUser?.email}</strong>
              <span className={`bc-role-badge ${(currentUser?.role || "admin").toLowerCase()}`}>
                {currentUser?.role || "admin"}
              </span>
            </p>
          </div>

          {isAdmin && (
            <button className="bc-btn bc-btn-primary" onClick={handleSaveProfile} disabled={saving} style={{ marginTop: 14, width: "100%", justifyContent: "center" }}>
              <Save size={15} />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          )}
        </div>

        {/* Partner Invites & Roles */}
        <div className="bc-card">
          <h2 className="bc-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UserPlus size={18} /> Partner & Member Access
          </h2>
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 16 }}>
            Give partners or co-founders access to this dashboard with granular roles.
          </p>

          {isAdmin ? (
            <>
              {inviteError && <p className="bc-error-text">{inviteError}</p>}
              {inviteSuccess && (
                <p style={{ color: "#FAFAFA", fontSize: 12.5, fontWeight: 600, marginBottom: 12 }}>
                  ✔ {inviteSuccess}
                </p>
              )}

              <form onSubmit={handleInvitePartner} style={{ marginBottom: 20 }}>
                <div className="bc-field">
                  <label className="bc-label">Partner Work Email</label>
                  <input
                    className="bc-input"
                    type="email"
                    placeholder="partner@company.in"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="bc-field">
                  <label className="bc-label">Assigned Role & Access Level</label>
                  <select
                    className="bc-select"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="view">View Only (Read Only)</option>
                    <option value="edit">Edit (Full Access)</option>
                    <option value="admin">Admin (Full Access + Invites)</option>
                  </select>
                </div>
                <button
                  className="bc-btn bc-btn-primary"
                  type="submit"
                  disabled={inviting}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <UserPlus size={15} />
                  {inviting ? "Granting Access…" : "Invite Partner"}
                </button>
              </form>

              {/* Members List */}
              <div style={{ borderTop: "1px solid #27272A", paddingTop: 14 }}>
                <p style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-soft)", marginBottom: 10 }}>
                  Active Workspace Partners ({members.length})
                </p>

                {membersLoading ? (
                  <p style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Loading partners…</p>
                ) : members.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: 0 }}>
                    No partners invited yet. Add partner emails above.
                  </p>
                ) : (
                  members.map((m) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #27272A" }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>{m.email}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--ink-soft)" }}>
                          Added {m.created_at?.slice(0, 10)}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <select
                          className="bc-select"
                          style={{ padding: "4px 8px", fontSize: 11.5, width: "auto" }}
                          value={m.role}
                          onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                        >
                          <option value="view">View</option>
                          <option value="edit">Edit</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button className="bc-icon-btn" onClick={() => handleRemoveMember(m.id)} aria-label="Revoke partner access">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: "20px 0", textAlign: "center", color: "var(--ink-soft)" }}>
              <ShieldAlert size={28} style={{ margin: "0 auto 8px", display: "block", color: "#A1A1AA" }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF", margin: 0 }}>
                Read-Only Member View
              </p>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                Only workspace Admins can invite new partners or modify access levels.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
