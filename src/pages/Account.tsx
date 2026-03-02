import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Navigate, Link } from "react-router";
import { api } from "../../convex/_generated/api";

export default function Account() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const orders = useQuery(api.users.myOrders, isAuthenticated ? {} : "skip");

  if (isLoading) return <p className="loading">Loading</p>;
  if (!isAuthenticated) return <Navigate to="/login?returnTo=/account" replace />;
  if (user === undefined || orders === undefined) return <p className="loading">Loading</p>;

  return (
    <div className="account">
      <div className="account__header">
        <h1 className="account__title">My Account</h1>
        <button className="account__logout-btn" onClick={() => void signOut()}>
          Sign Out
        </button>
      </div>

      <section className="account__section">
        <h2 className="account__section-title">Profile</h2>
        <p className="account__email">{user?.email}</p>
        {user?.isAdmin && (
          <Link to="/admin" className="account__admin-link">
            Admin Dashboard &rarr;
          </Link>
        )}
      </section>

      <section className="account__section">
        <h2 className="account__section-title">Order History</h2>
        {orders.length === 0 ? (
          <p className="account__empty">No orders yet. <Link to="/">Browse products</Link></p>
        ) : (
          <div className="account__orders">
            {orders.map((order) => (
              <div key={order._id} className="account__order">
                <div className="account__order-header">
                  <span className="account__order-id">
                    #{order._id.slice(-8).toUpperCase()}
                  </span>
                  <span className="account__order-date">
                    {new Date(order.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className={`order-card__status order-card__status--${order.status}`}>
                    {order.status}
                  </span>
                </div>
                <div className="account__order-items">
                  {order.items.map((item, i) => (
                    <div key={i} className="account__order-item">
                      <span>{item.name} &times; {item.quantity}</span>
                      <span>&euro;{((item.price * item.quantity) / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="account__order-total">
                  Total: &euro;{(order.total / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
