import React, { useState } from "react";
import { BUSINESS_TYPES } from "../utils/helpers";
import { auth, token as tokenStore } from "../utils/api";
import { ShieldCheck, ArrowRight, Lock, Mail, Building2, User } from "lucide-react";

export function Auth({ onLoginSuccess }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  const [ownerName, setOwnerName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    try {
      const res = await auth.login({ email, password });
      tokenStore.set(res.token);
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    if (!ownerName.trim() || !businessName.trim() || !email || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await auth.register({ email, password, ownerName, businessName, businessType });
      tokenStore.set(res.token);
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bc-auth-page">
      <div className="bc-auth-card">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 10, background: "#09090B",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF",
            boxShadow: "0 6px 16px rgba(9, 9, 11, 0.15)",
          }}>
            <ShieldCheck size={26} />
          </div>
        </div>

        <h1 className="bc-auth-logo">Vouta Business Console</h1>
        <p className="bc-auth-sub">
          {mode === "signin"
            ? "Sign in to access your ledger, compliance vault & finances."
            : "Register your business entity & launch your console."}
        </p>

        {error && (
          <div className="bc-error-text" style={{ textAlign: "center", marginBottom: 12 }}>
            {error}
          </div>
        )}

        {mode === "signin" ? (
          <form onSubmit={handleSignIn}>
            <div className="bc-field">
              <label className="bc-label">Work Email</label>
              <div style={{ position: "relative" }}>
                <input
                  className="bc-input"
                  type="email"
                  placeholder="founder@company.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: 36 }}
                  autoFocus
                  required
                />
                <Mail size={16} style={{ position: "absolute", left: 12, top: 13, color: "#A1A1AA" }} />
              </div>
            </div>

            <div className="bc-field">
              <label className="bc-label">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  className="bc-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: 36 }}
                  required
                />
                <Lock size={16} style={{ position: "absolute", left: 12, top: 13, color: "#A1A1AA" }} />
              </div>
            </div>

            <button
              className="bc-btn bc-btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", marginTop: 10, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Signing in…" : (<>Sign In to Console <ArrowRight size={16} /></>)}
            </button>

            <div className="bc-auth-footer">
              Don&apos;t have an account?{" "}
              <button type="button" className="bc-link-btn" onClick={() => { setError(""); setMode("signup"); }}>
                Register Entity
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignUp}>
            <div className="bc-field">
              <label className="bc-label">Owner / Director Name</label>
              <div style={{ position: "relative" }}>
                <input
                  className="bc-input"
                  placeholder="e.g. Ananya Sharma"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  style={{ paddingLeft: 36 }}
                  autoFocus
                  required
                />
                <User size={16} style={{ position: "absolute", left: 12, top: 13, color: "#A1A1AA" }} />
              </div>
            </div>

            <div className="bc-field">
              <label className="bc-label">Company / Entity Name</label>
              <div style={{ position: "relative" }}>
                <input
                  className="bc-input"
                  placeholder="e.g. Nexus Software Pvt Ltd"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  style={{ paddingLeft: 36 }}
                  required
                />
                <Building2 size={16} style={{ position: "absolute", left: 12, top: 13, color: "#A1A1AA" }} />
              </div>
            </div>

            <div className="bc-field">
              <label className="bc-label">Business Constitution</label>
              <select className="bc-select" value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
                {BUSINESS_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
              </select>
            </div>

            <div className="bc-field">
              <label className="bc-label">Work Email</label>
              <input
                className="bc-input"
                type="email"
                placeholder="founder@company.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="bc-field">
              <label className="bc-label">Password <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>(min. 8 chars)</span></label>
              <input
                className="bc-input"
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              className="bc-btn bc-btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", marginTop: 10, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Creating account…" : (<>Create Business Account <ArrowRight size={16} /></>)}
            </button>

            <div className="bc-auth-footer">
              Already registered?{" "}
              <button type="button" className="bc-link-btn" onClick={() => { setError(""); setMode("signin"); }}>
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
