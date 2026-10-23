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

  if (ready && user) return <Navigate to="/" replace />;

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
      navigate("/", { replace: true });
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
        {field("password", "Password", { type: "password", autoComplete: "new-password" })}
        <span className="hint">At least 8 characters, not too common.</span>
        <button className="btn btn-primary block" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
      </form>
      <p className="alt">Already registered? <Link to="/login">Sign in</Link></p>
    </div>
  );
}
