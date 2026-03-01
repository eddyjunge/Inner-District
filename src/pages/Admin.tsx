import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface ProductForm {
  name: string;
  description: string;
  price: string;
  stripePriceId: string;
  category: string;
  stock: string;
}

const emptyForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  stripePriceId: "",
  category: "",
  stock: "",
};

export default function Admin() {
  const [adminSecret, setAdminSecret] = useState(() =>
    sessionStorage.getItem("admin-secret") ?? "",
  );
  const [authenticated, setAuthenticated] = useState(
    () => !!sessionStorage.getItem("admin-secret"),
  );

  const products = useQuery(
    api.admin.listProducts,
    authenticated ? { adminSecret } : "skip",
  );
  const orders = useQuery(
    api.admin.listOrders,
    authenticated ? { adminSecret } : "skip",
  );
  const createProduct = useMutation(api.admin.createProduct);
  const updateProduct = useMutation(api.admin.updateProduct);
  const deleteProduct = useMutation(api.admin.deleteProduct);
  const updateOrderStatus = useMutation(api.admin.updateOrderStatus);
  const generateUploadUrl = useMutation(api.upload.generateUploadUrl);
  const getImageUrl = useMutation(api.upload.getUrl);

  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [editingId, setEditingId] = useState<Id<"products"> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      const url = await getImageUrl({ storageId });
      if (url) newUrls.push(url);
    }
    setImageUrls((prev) => [...prev, ...newUrls]);
    setUploading(false);
  }, [generateUploadUrl, getImageUrl]);

  const startEdit = (p: NonNullable<typeof products>[number]) => {
    setEditingId(p._id);
    setForm({
      name: p.name,
      description: p.description,
      price: (p.price / 100).toFixed(2),
      stripePriceId: p.stripePriceId,
      category: p.category,
      stock: String(p.stock),
    });
    setImageUrls(p.images || []);
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImageUrls([]);
  };

  if (!authenticated) {
    return (
      <div className="login">
        <h1 className="login__title">Admin</h1>
        <form
          className="login__form"
          onSubmit={(e) => {
            e.preventDefault();
            sessionStorage.setItem("admin-secret", adminSecret);
            setAuthenticated(true);
          }}
        >
          <input
            type="password"
            placeholder="Admin password"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            required
          />
          <button type="submit" className="login__btn">Login</button>
        </form>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateProduct({
        adminSecret,
        id: editingId,
        name: form.name,
        description: form.description,
        price: Math.round(parseFloat(form.price) * 100),
        stripePriceId: form.stripePriceId,
        images: imageUrls,
        category: form.category,
        stock: parseInt(form.stock),
      });
      setEditingId(null);
    } else {
      await createProduct({
        adminSecret,
        name: form.name,
        description: form.description,
        price: Math.round(parseFloat(form.price) * 100),
        stripePriceId: form.stripePriceId,
        images: imageUrls,
        category: form.category,
        stock: parseInt(form.stock),
      });
    }
    setForm(emptyForm);
    setImageUrls([]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="admin">
      <h1 className="admin__title">Admin Dashboard</h1>

      <section className="admin__section">
        <h2 className="admin__section-title">
          {editingId ? "Edit Product" : "Add Product"}
        </h2>
        <form ref={formRef} onSubmit={handleSubmit} className="admin__form">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          <input placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} required />
          <input placeholder="Price (dollars, e.g. 19.99)" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} required />
          <input placeholder="Stripe Price ID (price_xxx)" value={form.stripePriceId} onChange={(e) => setForm((p) => ({ ...p, stripePriceId: e.target.value }))} required />
          <input placeholder="Category" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} required />
          <input placeholder="Stock" type="number" value={form.stock} onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))} required />

          <div
            className={`upload-zone${dragActive ? " upload-zone--active" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <span className="upload-zone__uploading">Uploading...</span>
            ) : (
              <span className="upload-zone__text">
                Drop images here or click to browse
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  uploadFiles(e.target.files);
                  e.target.value = "";
                }
              }}
            />
          </div>

          {imageUrls.length > 0 && (
            <div className="upload-zone__previews">
              {imageUrls.map((url, i) => (
                <div key={i} className="upload-zone__preview-wrap">
                  <img src={url} alt="" className="upload-zone__preview" />
                  <button
                    type="button"
                    className="upload-zone__remove"
                    onClick={() => removeImage(i)}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="admin__form-actions">
            <button type="submit" disabled={uploading}>
              {editingId ? "Save Changes" : "Create Product"}
            </button>
            {editingId && (
              <button type="button" className="admin__cancel-btn" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="admin__section">
        <h2 className="admin__section-title">Products</h2>
        {products === undefined ? (
          <p className="loading">Loading</p>
        ) : (
          <div className="admin__table-wrap">
            <table className="admin__table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id}>
                    <td>
                      {p.images && p.images.length > 0 ? (
                        <img
                          src={p.images[0]}
                          alt=""
                          style={{ width: 40, height: 40, objectFit: "cover", border: "1px solid var(--fg)" }}
                        />
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: "0.6rem" }}>—</span>
                      )}
                    </td>
                    <td>{p.name}</td>
                    <td>${(p.price / 100).toFixed(2)}</td>
                    <td>{p.stock}</td>
                    <td>{p.isActive ? "Yes" : "No"}</td>
                    <td>
                      <div className="admin__table-actions">
                        <button
                          className="admin__action-btn"
                          onClick={() => startEdit(p)}
                        >
                          Edit
                        </button>
                        <button
                          className="admin__action-btn"
                          onClick={() => updateProduct({ adminSecret, id: p._id, isActive: !p.isActive })}
                        >
                          {p.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          className="admin__delete-btn"
                          onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteProduct({ adminSecret, id: p._id }); }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin__section">
        <h2 className="admin__section-title">Orders</h2>
        {orders === undefined ? (
          <p className="loading">Loading</p>
        ) : orders.length === 0 ? (
          <p className="admin__no-orders">No orders yet.</p>
        ) : (
          <div className="order-list">
            {orders.map((order) => (
              <div key={order._id} className="order-card">
                <div className="order-card__header">
                  <span className={`order-card__status order-card__status--${order.status}`}>
                    {order.status}
                  </span>
                  <span className="order-card__date">
                    {new Date(order.createdAt).toLocaleDateString(undefined, {
                      year: "numeric", month: "short", day: "numeric",
                    })}
                    {" "}
                    {new Date(order.createdAt).toLocaleTimeString(undefined, {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="order-card__id">#{order._id.slice(-8).toUpperCase()}</div>

                <div className="order-card__columns">
                  <div className="order-card__col">
                    <div className="order-card__label">Items</div>
                    <div className="order-card__items">
                      {order.items.map((item: any, idx: number) => (
                        <div key={idx} className="order-card__item">
                          <span>{item.name} &times; {item.quantity}</span>
                          <span>€{((item.price * item.quantity) / 100).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="order-card__item order-card__item--total">
                        <span>Total</span>
                        <span>€{(order.total / 100).toFixed(2)}</span>
                      </div>
                      {order.vatRate != null && (
                        <div className="order-card__item" style={{ color: "var(--muted)", fontSize: "0.7rem" }}>
                          <span>inkl. {order.vatRate}% MwSt</span>
                          <span>€{((order.vatAmount ?? 0) / 100).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="order-card__col">
                    <div className="order-card__label">Ship To</div>
                    <div className="order-card__address">
                      <p>{order.shippingAddress.name}</p>
                      <p>{order.shippingAddress.line1}</p>
                      {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                      <p>
                        {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                      </p>
                      <p>{order.shippingAddress.country}</p>
                    </div>

                    <div className="order-card__label" style={{ marginTop: "1rem" }}>Contact</div>
                    <div className="order-card__email">{order.email}</div>
                  </div>
                </div>

                <div className="order-card__actions">
                  {order.status === "paid" && (
                    <button onClick={() => updateOrderStatus({ adminSecret, id: order._id, status: "shipped" })}>
                      Mark Shipped
                    </button>
                  )}
                  {order.status === "shipped" && (
                    <button onClick={() => updateOrderStatus({ adminSecret, id: order._id, status: "delivered" })}>
                      Mark Delivered
                    </button>
                  )}
                  {(order.status === "paid" || order.status === "shipped") && (
                    <button
                      className="admin__delete-btn"
                      onClick={() => {
                        if (confirm("Cancel this order?"))
                          updateOrderStatus({ adminSecret, id: order._id, status: "cancelled" });
                      }}
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
