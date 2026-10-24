import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { useToast } from "./Toast.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close mobile drawer whenever location changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Prevent background scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const onLogout = () => {
    logout();
    setMenuOpen(false);
    toast("Signed out");
    navigate("/");
  };

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand" aria-label="InfiCatalog home">
            <img
              src="/assets/logo.png"
              alt="InfiCatalog"
              className="brand-logo-img"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                if (e.currentTarget.nextElementSibling) {
                  e.currentTarget.nextElementSibling.style.display = "inline-flex";
                }
              }}
            />
            <span className="brand-name" style={{ display: "none" }}>
              INFI<span>CATALOG</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="nav-actions desktop-nav">
            <Link className="login-link" to="/catalog">
              Explore Catalog
            </Link>
            {user ? (
              <>
                <Link className="btn btn-yellow nav-btn" to="/products">
                  My Catalog <span className="arrow">↗</span>
                </Link>
                <div className="nav-profile-card" title={`Logged in as ${user.username}`}>
                  <div className="nav-profile-avatar" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="nav-profile-info">
                    <span className="nav-profile-name">{user.username}</span>
                    <button type="button" className="nav-profile-logout" onClick={onLogout}>
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link className="login-link" to="/login">
                  Log in
                </Link>
                <Link className="btn btn-yellow nav-btn" to="/register">
                  Get started <span className="arrow">↗</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button (Three Horizontal Bars) */}
          <button
            type="button"
            className={`hamburger-btn ${menuOpen ? "open" : ""}`}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop & Menu */}
      {menuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMenuOpen(false)}>
          <div
            className="mobile-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="drawer-head">
              <div className="drawer-user">
                {user ? (
                  <div className="nav-profile-card drawer-profile-card">
                    <div className="nav-profile-avatar drawer-profile-avatar" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div className="nav-profile-info">
                      <span className="nav-profile-name">{user.username}</span>
                      <button
                        type="button"
                        className="nav-profile-logout"
                        onClick={() => {
                          setMenuOpen(false);
                          onLogout();
                        }}
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className="drawer-guest-badge">Welcome Guest</span>
                )}
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                ✕
              </button>
            </div>

            <nav className="drawer-nav">
              <Link to="/" className={`drawer-link ${location.pathname === "/" ? "active" : ""}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span>Home</span>
              </Link>

              <Link to="/catalog" className={`drawer-link ${location.pathname === "/catalog" ? "active" : ""}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span>Global Catalog</span>
              </Link>

              {user ? (
                <>
                  <Link to="/products" className={`drawer-link ${location.pathname === "/products" ? "active" : ""}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    <span>My Catalog</span>
                  </Link>

                  <Link to="/products/new" className={`drawer-link ${location.pathname === "/products/new" ? "active" : ""}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    <span>Add New Product</span>
                  </Link>
                </>
              ) : null}
            </nav>

            <div className="drawer-footer">
              {user ? (
                <button type="button" className="btn btn-outline-danger block" onClick={onLogout}>
                  Sign out
                </button>
              ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  <Link to="/login" className="btn btn-outline block">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn btn-yellow block">
                    Create Account <span className="arrow">↗</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
