import { Link } from "react-router";
import { useCart } from "../lib/cart";
import CookieBanner from "./CookieBanner";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { totalItems } = useCart();

  return (
    <div>
      <header className="header">
        <Link to="/" className="header__brand">
          <img src="/logo.png" alt="" className="header__logo" />
          <span>Inner District</span>
        </Link>
        <nav>
          <Link to="/cart" className="header__cart-link">
            Cart
            <span className="header__cart-count">{totalItems}</span>
          </Link>
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
