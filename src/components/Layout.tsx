import { Link } from "react-router";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";
import { useCart } from "../lib/cart";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { totalItems } = useCart();

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 2rem", borderBottom: "1px solid #ddd" }}>
        <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
          <strong>Inner District</strong>
        </Link>
        <nav style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link to="/cart">Cart ({totalItems})</Link>
          <SignedIn>
            <Link to="/account">Orders</Link>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal" />
          </SignedOut>
        </nav>
      </header>
      <main style={{ padding: "2rem" }}>{children}</main>
    </div>
  );
}
