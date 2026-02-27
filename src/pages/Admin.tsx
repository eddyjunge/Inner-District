import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";

export default function Admin() {
  const { isSignedIn, isLoaded } = useAuth();
  const products = useQuery(api.admin.listProducts, isSignedIn ? {} : "skip");
  const orders = useQuery(api.admin.listOrders, isSignedIn ? {} : "skip");

  if (!isLoaded) return <p>Loading...</p>;
  if (!isSignedIn) return <p>Access denied. Please sign in.</p>;
  const createProduct = useMutation(api.admin.createProduct);
  const updateProduct = useMutation(api.admin.updateProduct);
  const updateOrderStatus = useMutation(api.admin.updateOrderStatus);

  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    stripePriceId: "",
    category: "",
    stock: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createProduct({
      name: newProduct.name,
      description: newProduct.description,
      price: Math.round(parseFloat(newProduct.price) * 100),
      stripePriceId: newProduct.stripePriceId,
      images: [],
      category: newProduct.category,
      stock: parseInt(newProduct.stock),
    });
    setNewProduct({ name: "", description: "", price: "", stripePriceId: "", category: "", stock: "" });
  };

  return (
    <div>
      <h1>Admin Dashboard</h1>

      <section>
        <h2>Add Product</h2>
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 400 }}>
          <input placeholder="Name" value={newProduct.name} onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))} required />
          <input placeholder="Description" value={newProduct.description} onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))} required />
          <input placeholder="Price (dollars, e.g. 19.99)" value={newProduct.price} onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))} required />
          <input placeholder="Stripe Price ID (price_xxx)" value={newProduct.stripePriceId} onChange={(e) => setNewProduct((p) => ({ ...p, stripePriceId: e.target.value }))} required />
          <input placeholder="Category" value={newProduct.category} onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))} required />
          <input placeholder="Stock" type="number" value={newProduct.stock} onChange={(e) => setNewProduct((p) => ({ ...p, stock: e.target.value }))} required />
          <button type="submit">Create Product</button>
        </form>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Products</h2>
        {products === undefined ? (
          <p>Loading...</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Name</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Price</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Stock</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Active</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id}>
                  <td style={{ padding: "0.5rem" }}>{p.name}</td>
                  <td style={{ padding: "0.5rem" }}>${(p.price / 100).toFixed(2)}</td>
                  <td style={{ padding: "0.5rem" }}>{p.stock}</td>
                  <td style={{ padding: "0.5rem" }}>{p.isActive ? "Yes" : "No"}</td>
                  <td style={{ padding: "0.5rem" }}>
                    <button onClick={() => updateProduct({ id: p._id, isActive: !p.isActive })}>
                      {p.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Orders</h2>
        {orders === undefined ? (
          <p>Loading...</p>
        ) : orders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          orders.map((order) => (
            <div key={order._id} style={{ border: "1px solid #ddd", padding: "1rem", marginBottom: "0.5rem", borderRadius: "8px" }}>
              <p><strong>{order._id}</strong> — {order.status} — ${(order.total / 100).toFixed(2)}</p>
              <p>{new Date(order.createdAt).toLocaleString()}</p>
              <p>{order.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}</p>
              {order.status === "paid" && (
                <button onClick={() => updateOrderStatus({ id: order._id, status: "shipped" })}>
                  Mark Shipped
                </button>
              )}
              {order.status === "shipped" && (
                <button onClick={() => updateOrderStatus({ id: order._id, status: "delivered" })}>
                  Mark Delivered
                </button>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
