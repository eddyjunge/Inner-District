import { useSearchParams, Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect } from "react";
import { useCart } from "../lib/cart";

export default function Success() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  const order = useQuery(
    api.orders.getBySessionId,
    sessionId ? { stripeSessionId: sessionId } : "skip",
  );

  return (
    <div className="status-page">
      <h1 className="status-page__title">Payment Successful</h1>
      {order ? (
        <div>
          <p className="status-page__detail">
            Subtotal: €{(order.subtotal / 100).toFixed(2)}
          </p>
          <p className="status-page__detail">
            Shipping: €{(order.shipping / 100).toFixed(2)}
          </p>
          <p className="status-page__detail">
            <strong>Total: €{(order.total / 100).toFixed(2)}</strong>
          </p>
          {order.vatRate != null && order.vatAmount != null && (
            <p className="status-page__detail" style={{ color: "var(--muted)" }}>
              inkl. {order.vatRate}% MwSt: €{(order.vatAmount / 100).toFixed(2)}
            </p>
          )}
          <p className="status-page__detail">Status: {order.status}</p>
          <ul className="status-page__items">
            {order.items.map((item, i) => (
              <li key={i}>
                {item.name} x{item.quantity} — €{((item.price * item.quantity) / 100).toFixed(2)}
              </li>
            ))}
          </ul>
          {order.items.some((item: any) => (item.productType ?? "physical") === "digital") && (
            <div className="status-page__digital" style={{ marginTop: "2rem" }}>
              <h2 className="status-page__subtitle">Digital Downloads</h2>
              {order.items
                .filter((item: any) => (item.productType ?? "physical") === "digital")
                .map((item: any, i: number) => (
                  <div key={i} style={{ marginBottom: "1rem" }}>
                    <strong>{item.name}</strong>
                    {item.downloadUrl && (
                      <p>
                        <a href={item.downloadUrl} target="_blank" rel="noopener noreferrer" className="status-page__download-link">
                          Download
                        </a>
                      </p>
                    )}
                    {item.licenseKey && (
                      <p className="status-page__license">
                        License Key: <code>{item.licenseKey}</code>
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : (
        <p className="status-page__msg">
          Processing your order... This page will update automatically.
        </p>
      )}
      <Link to="/" className="status-page__link">
        Continue Shopping
      </Link>
    </div>
  );
}
