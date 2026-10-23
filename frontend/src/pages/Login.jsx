import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { firstError, parseError } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useToast } from "../components/Toast.jsx";

export default function Login() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const from = location.state?.from || "/";
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState({ message: "", fields: {} });
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="auth">
      <h1>Sign in</h1>
      <p className="sub">Sign in to add and manage your products.</p>
      {error.message && <div className="banner banner-error" role="alert">{error.message}</div>}
      <form onSubmit={submit} className="form" noValidate>
        <label>Username
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" required autoFocus />
          {firstError(error.fields, "username") && <span className="err">{firstError(error.fields, "username")}</span>}
        </label>
        <label>Password
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" required />
        </label>
        <button className="btn btn-primary block" disabled={busy || !form.username || !form.password}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <div className="demo">
        <p>Reviewing this project? Use the demo account.</p>
        <button type="button" className="btn btn-outline" onClick={() => setForm({ username: "demo", password: "Demo@12345" })}>Fill demo login</button>
      </div>
      <p className="alt">New here? <Link to="/register">Create an account</Link></p>
    </div>
  );
}
