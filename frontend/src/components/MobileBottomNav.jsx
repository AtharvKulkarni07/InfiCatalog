import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <Link
        to="/"
        className={`bottom-nav-item ${path === "/" ? "active" : ""}`}
        aria-label="Home"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>Home</span>
      </Link>

      <Link
        to="/catalog"
        className={`bottom-nav-item ${path === "/catalog" ? "active" : ""}`}
        aria-label="Global Catalog"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10z" />
        </svg>
        <span>Catalog</span>
      </Link>

      {user ? (
        <>
          <Link
            to="/products"
            className={`bottom-nav-item ${path === "/products" ? "active" : ""}`}
            aria-label="My Products"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <span>My Items</span>
          </Link>

          <Link
            to="/products/new"
            className={`bottom-nav-item ${path === "/products/new" ? "active" : ""}`}
            aria-label="Add Product"
          >
            <div className="bottom-nav-plus">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <span>Add</span>
          </Link>
        </>
      ) : (
        <>
          <Link
            to="/register"
            className={`bottom-nav-item ${path === "/register" ? "active" : ""}`}
            aria-label="Sign Up"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            <span>Join</span>
          </Link>

          <Link
            to="/login"
            className={`bottom-nav-item ${path === "/login" ? "active" : ""}`}
            aria-label="Sign In"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <span>Sign In</span>
          </Link>
        </>
      )}
    </nav>
  );
}
