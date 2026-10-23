import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { firstError, parseError } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useToast } from "../components/Toast.jsx";

export default function Register() {
  const { user, ready, register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState({ message: "", fields: {} });
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (ready && user) return <Navigate to="/products" replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError({ message: "", fields: {} });
    if (form.password.length < 8) {
      setError({ message: "", fields: { password: ["Use at least 8 characters."] } });
      return;
    }
    setBusy(true);
    try {
      await register({ username: form.username.trim(), email: form.email.trim(), password: form.password });
      toast("Account created. You're signed in.");
      navigate("/products", { replace: true });
    } catch (err) {
      setError(parseError(err));
    } finally {
      setBusy(false);
    }
  };

  const field = (name, label, props = {}) => (
    <label>{label}
      <input value={form[name]} onChange={set(name)} required aria-invalid={Boolean(firstError(error.fields, name))} {...props} />
      {firstError(error.fields, name) && <span className="err">{firstError(error.fields, name)}</span>}
    </label>
  );

  return (
    <div className="auth">
      <h1>Create your account</h1>
      <p className="sub">It takes a few seconds. No email verification needed.</p>
      {error.message && !Object.keys(error.fields).length && <div className="banner banner-error" role="alert">{error.message}</div>}
      <form onSubmit={submit} className="form" noValidate>
        {field("username", "Username", { autoComplete: "username", autoFocus: true })}
        {field("email", "Email", { type: "email", autoComplete: "email" })}
        <label>Password
          <div className="password-wrap">
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
              autoComplete="new-password"
              required
              aria-invalid={Boolean(firstError(error.fields, "password"))}
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
          {firstError(error.fields, "password") && <span className="err">{firstError(error.fields, "password")}</span>}
        </label>
        <span className="hint">At least 8 characters, not too common.</span>
        <button className="btn btn-yellow block" disabled={busy}>{busy ? "Creating account…" : <>Create account <span className="arrow">↗</span></>}</button>
      </form>
      <p className="alt">Already registered? <Link to="/login">Sign in</Link></p>
    </div>
  );
}
