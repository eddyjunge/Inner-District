import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCart } from "../lib/cart";

export default function Checkout() {
  const { items, totalItems } = useCart();
  const navigate = useNavigate();

  const productIds = items.map((i) => i.productId);
  const products = useQuery(
    api.products.getMultiple,
    productIds.length > 0 ? { ids: productIds } : "skip",
  );
  const createDemoOrder = useMutation(api.demoOrders.createDemoOrder);

  const [form, setForm] = useState({
    email: "",
    name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (totalItems === 0) {
    return (
      <div className="checkout">
        <p className="cart__empty">
          Your cart is empty. <Link to="/">Browse products</Link>
        </p>
      </div>
    );
  }

  if (products === undefined) return <p className="loading">Loading</p>;

  const cartWithProducts = items
    .map((item) => {
      const product = products.find((p) => p._id === item.productId);
      return product ? { ...item, product } : null;
    })
    .filter((i): i is NonNullable<typeof i> => i !== null);

  const subtotal = cartWithProducts.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await createDemoOrder({
        email: form.email,
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
      });
      navigate(`/success?session_id=${result.sessionId}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setSubmitting(false);
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="checkout">
      <h1 className="checkout__title">Checkout</h1>

      <div className="checkout__summary">
        <h2 className="checkout__section-title">Order Summary</h2>
        {cartWithProducts.map(({ productId, quantity, product }) => (
          <div key={productId} className="checkout__item">
            <span>{product.name} x{quantity}</span>
            <span>${((product.price * quantity) / 100).toFixed(2)}</span>
          </div>
        ))}
        <div className="checkout__total">
          <span>Total</span>
          <span>${(subtotal / 100).toFixed(2)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="checkout__form">
        <h2 className="checkout__section-title">Contact</h2>
        <input placeholder="Email" type="email" value={form.email} onChange={set("email")} required />

        <h2 className="checkout__section-title" style={{ marginTop: "1.5rem" }}>Shipping Address</h2>
        <input placeholder="Full name" value={form.name} onChange={set("name")} required />
        <input placeholder="Address line 1" value={form.line1} onChange={set("line1")} required />
        <input placeholder="Address line 2 (optional)" value={form.line2} onChange={set("line2")} />
        <div className="checkout__row">
          <input placeholder="City" value={form.city} onChange={set("city")} required />
          <input placeholder="State" value={form.state} onChange={set("state")} required />
        </div>
        <div className="checkout__row">
          <input placeholder="Postal code" value={form.postalCode} onChange={set("postalCode")} required />
          <input placeholder="Country" value={form.country} onChange={set("country")} required />
        </div>

        {error && <p className="checkout__error">{error}</p>}

        <button type="submit" className="checkout__submit" disabled={submitting}>
          {submitting ? "Placing order..." : "Place Order (Demo)"}
        </button>

        <div className="checkout__demo-notice">
          This is a demo checkout. No real payment is processed.
        </div>
      </form>

      <Link to="/cart" className="checkout__back">
        &larr; Back to cart
      </Link>
    </div>
  );
}
