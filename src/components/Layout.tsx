import { Link } from "react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useCart } from "../lib/cart";
import { api } from "../../convex/_generated/api";
import CookieBanner from "./CookieBanner";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { totalItems } = useCart();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  return (
    <div>
      <header className="header">
        <Link to="/" className="header__brand">
          <img src="/logo.png" alt="" className="header__logo" />
          <span>Inner District</span>
        </Link>
        <nav className="header__nav">
          <Link to="/cart" className="header__cart-link">
            Cart
            <span className="header__cart-count">{totalItems}</span>
          </Link>
          {!isLoading && (
            isAuthenticated ? (
              <div className="header__user">
                <Link to="/account" className="header__user-link">
                  {user?.email ?? "Account"}
                </Link>
                <button className="header__logout-btn" onClick={() => void signOut()}>
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="header__auth-link">
                Sign In
              </Link>
            )
          )}
        </nav>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        <div className="footer__inner">
          <nav className="footer__links">
            <Link to="/impressum">Impressum</Link>
            <span className="footer__sep">|</span>
            <Link to="/cookies">Datenschutz &amp; Cookies</Link>
          </nav>
          <p className="footer__copy">&copy; 2026 Inner District</p>
        </div>
      </footer>
      <CookieBanner />
    </div>
  );
}
