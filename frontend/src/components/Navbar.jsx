import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { Mark } from "./Icons.jsx";
import { useToast } from "./Toast.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const onLogout = () => {
    logout();
    toast("Signed out");
    navigate("/");
  };

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand" aria-label="Infilect Catalog home">
          <Mark />
          <span>Infilect Catalog</span>
        </Link>
        <nav className="nav-links" aria-label="Main">
          <NavLink to="/" end>Products</NavLink>
          {user && <NavLink to="/products/new">Add product</NavLink>}
        </nav>
        <div className="nav-user">
          {user ? (
            <>
              <span className="who">{user.username}</span>
              <button className="btn btn-ghost-light" onClick={onLogout}>Sign out</button>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost-light" to="/login">Sign in</Link>
              <Link className="btn btn-accent" to="/register">Create account</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
