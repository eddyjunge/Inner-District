import { useState, FormEvent } from "react";
import { useAction } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import { useCart } from "../lib/cart";
import { Link } from "react-router";

export default function Checkout() {
  const { items, totalItems } = useCart();
  const { isSignedIn } = useAuth();
  const createCheckout = useAction(api.stripe.createCheckoutSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
  });

  if (totalItems === 0) {
    return <p>Your cart is empty. <Link to="/">Browse products</Link></p>;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = await createCheckout({
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        shippingAddress: {
          name: form.name,
          line1: form.line1,
          line2: form.line2 || undefined,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: form.country,
        },
        guestEmail: !isSignedIn ? form.email : undefined,
      });

      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div style={{ maxWidth: 500 }}>
      <h1>Checkout</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <h2>Shipping Address</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <input placeholder="Full Name" value={form.name} onChange={update("name")} required />
          {!isSignedIn && (
            <input placeholder="Email" type="email" value={form.email} onChange={update("email")} required />
          )}
          <input placeholder="Address Line 1" value={form.line1} onChange={update("line1")} required />
          <input placeholder="Address Line 2 (optional)" value={form.line2} onChange={update("line2")} />
          <input placeholder="City" value={form.city} onChange={update("city")} required />
          <input placeholder="State" value={form.state} onChange={update("state")} required />
          <input placeholder="Postal Code" value={form.postalCode} onChange={update("postalCode")} required />
          <input placeholder="Country" value={form.country} onChange={update("country")} required />
        </div>
        <button type="submit" disabled={loading} style={{ marginTop: "1rem" }}>
          {loading ? "Redirecting to payment..." : "Pay with Stripe"}
        </button>
      </form>
    </div>
  );
}
