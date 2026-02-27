import { Routes, Route } from "react-router";
import { useMutation } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { api } from "../convex/_generated/api";
import Layout from "./components/Layout";
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Success from "./pages/Success";
import Cancel from "./pages/Cancel";
import Account from "./pages/Account";
import Admin from "./pages/Admin";

export default function App() {
  const { isSignedIn } = useAuth();
  const ensureUser = useMutation(api.users.ensureUser);

  useEffect(() => {
    if (isSignedIn) {
      ensureUser();
    }
  }, [isSignedIn, ensureUser]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
        <Route path="/account" element={<Account />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Layout>
  );
}
