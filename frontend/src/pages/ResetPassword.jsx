import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, parseError } from "../api.js";
import { useToast } from "../components/Toast.jsx";

export default function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post("/auth/password-reset-confirm/", {
        uid,
        token,
        new_password: password,
      });
      setSuccess(true);
      toast("Password reset successfully! Please sign in.");
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.message || "Failed to reset password. The link may have expired.");
    } finally {
      setBusy(false);
    }
  };

  if (success) {
    return (
      <div className="auth">
        <h1>Password Reset!</h1>
        <div className="banner banner-success" role="status" style={{ background: "#e8f8f0", color: "#065f46", border: "1px solid #bbf7d0", padding: "1rem", borderRadius: "12px", margin: "1.5rem 0" }}>
          ✓ Your password has been successfully reset. Redirecting to sign in...
        </div>
        <Link to="/login" className="btn btn-yellow block">
          Go to Sign In <span className="arrow">↗</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="auth">
      <h1>Set new password</h1>
      <p className="sub">Enter and confirm your new account password below.</p>

      {error && <div className="banner banner-error" role="alert">{error}</div>}

      <form onSubmit={submit} className="form" noValidate>
        <label>
          New Password
          <div className="password-wrap">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter at least 8 characters"
              autoComplete="new-password"
              required
              autoFocus
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

        <label>
          Confirm New Password
          <div className="password-wrap">
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              autoComplete="new-password"
              required
            />
          </div>
        </label>

        <span className="hint">Must be at least 8 characters long.</span>

        <button className="btn btn-yellow block" disabled={busy || !password || !confirmPassword}>
          {busy ? "Saving new password…" : <>Reset password <span className="arrow">↗</span></>}
        </button>
      </form>

      <p className="alt">Remember your password? <Link to="/login">Sign in</Link></p>
    </div>
  );
}
