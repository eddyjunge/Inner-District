import { useQuery } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { SignInButton } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import { Link } from "react-router";

export default function Account() {
  const { isSignedIn, isLoaded } = useAuth();
  const orders = useQuery(api.orders.listByUser, isSignedIn ? {} : "skip");

  if (!isLoaded) return <p>Loading...</p>;
  if (!isSignedIn) {
    return (
      <div>
        <h1>My Orders</h1>
        <p>Please sign in to view your order history.</p>
        <SignInButton mode="modal" />
      </div>
    );
  }

  if (orders === undefined) return <p>Loading...</p>;

  return (
    <div>
      <h1>My Orders</h1>
      {orders.length === 0 ? (
        <p>No orders yet. <Link to="/">Browse products</Link></p>
      ) : (
        orders.map((order) => (
          <div key={order._id} style={{ border: "1px solid #ddd", padding: "1rem", marginBottom: "1rem", borderRadius: "8px" }}>
            <p><strong>Order {order._id}</strong></p>
            <p>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
            <p>Status: {order.status}</p>
            <p>Total: ${(order.total / 100).toFixed(2)}</p>
            <ul>
              {order.items.map((item, i) => (
                <li key={i}>{item.name} x{item.quantity}</li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
