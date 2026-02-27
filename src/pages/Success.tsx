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
    <div>
      <h1>Payment Successful!</h1>
      {order ? (
        <div>
          <p>Order confirmed. Total: ${(order.total / 100).toFixed(2)}</p>
          <p>Status: {order.status}</p>
          <p>Items:</p>
          <ul>
            {order.items.map((item, i) => (
              <li key={i}>
                {item.name} x{item.quantity} — ${(item.price / 100).toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>Processing your order... This page will update automatically.</p>
      )}
      <Link to="/">Continue Shopping</Link>
    </div>
  );
}
