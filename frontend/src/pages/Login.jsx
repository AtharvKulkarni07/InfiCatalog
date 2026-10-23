import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { api, firstError, parseError } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useToast } from "../components/Toast.jsx";

export default function Login() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const from = location.state?.from || "/products";
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState({ message: "", fields: {} });
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotDone, setForgotDone] = useState(false);
  const [forgotError, setForgotError] = useState("");

  if (ready && user) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError({ message: "", fields: {} });
    setBusy(true);
    try {
      await login(form.username.trim(), form.password);
      toast("Welcome back");
      navigate(from, { replace: true });
    } catch (err) {
      setError(parseError(err));
    } finally {
      setBusy(false);
    }
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    setForgotError("");
    if (!forgotEmail.trim()) { setForgotError("Please enter your email address."); return; }
    setForgotBusy(true);
    try {
      await api.post("/auth/password-reset/", { email: forgotEmail.trim() });
      setForgotDone(true);
    } catch (err) {
      const parsed = parseError(err);
      // Show generic message — don't leak if email exists
      setForgotDone(true); // Always show success to prevent email enumeration
    } finally {
      setForgotBusy(false);
    }
  };

  if (forgotMode) {
    return (
      <div className="auth">
        <button
          type="button"
          className="linkbtn"
          style={{ marginBottom: "1.2rem", fontSize: "0.9rem" }}
          onClick={() => { setForgotMode(false); setForgotDone(false); setForgotError(""); setForgotEmail(""); }}
        >
          ← Back to sign in
        </button>
        <h1>Reset password</h1>
        <p className="sub">Enter your email address and we'll send you a reset link.</p>
        {forgotDone ? (
          <div className="banner banner-success" role="status">
            ✓ If an account exists with that email, a reset link has been sent. Check your inbox.
          </div>
        ) : (
          <form onSubmit={submitForgot} className="form" noValidate>
            {forgotError && <div className="banner banner-error" role="alert">{forgotError}</div>}
            <label>Email address
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="Enter your registered email"
                autoComplete="email"
                required
                autoFocus
              />
            </label>
            <button className="btn btn-yellow block" disabled={forgotBusy || !forgotEmail.trim()}>
              {forgotBusy ? "Sending…" : <>Send reset link <span className="arrow">↗</span></>}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="auth">
      <h1>Sign in</h1>
      <p className="sub">Sign in to add and manage your products.</p>
      {error.message && <div className="banner banner-error" role="alert">{error.message}</div>}
      <form onSubmit={submit} className="form" noValidate>
        <label>Username or Email
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="Enter username or email"
            autoComplete="username"
            required
            autoFocus
          />
          {firstError(error.fields, "username") && <span className="err">{firstError(error.fields, "username")}</span>}
        </label>
        <label>Password
          <div className="password-wrap">
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="eye-btn"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </label>
        <div style={{ textAlign: "right", marginTop: "-0.5rem" }}>
          <button type="button" className="linkbtn" style={{ fontSize: "0.85rem" }} onClick={() => setForgotMode(true)}>
            Forgot password?
          </button>
        </div>
        <button className="btn btn-yellow block" disabled={busy || !form.username || !form.password}>
          {busy ? "Signing in…" : <>Sign in <span className="arrow">↗</span></>}
        </button>
      </form>
      <p className="alt">New here? <Link to="/register">Create an account</Link></p>
    </div>
  );
}
