import { useState, useRef, useCallback, Fragment, Component, type ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

class AdminErrorBoundary extends Component<
  { onAuthError: () => void; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (error.message.includes("Not authorized")) {
      sessionStorage.removeItem("adminSecret");
      this.props.onAuthError();
    }
  }

  reset() {
    this.setState({ hasError: false });
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

interface ProductForm {
  name: string;
  description: string;
  price: string;
  stripePriceId: string;
  category: string;
  stock: string;
  productType: "physical" | "digital";
  downloadFileId: string;
  downloadFileName: string;
}

const emptyForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  stripePriceId: "",
  category: "",
  stock: "",
  productType: "physical",
  downloadFileId: "",
  downloadFileName: "",
};

export default function Admin() {
  const [adminSecret, setAdminSecret] = useState(
    () => sessionStorage.getItem("adminSecret") ?? "",
  );
  const [secretInput, setSecretInput] = useState("");
  const [authError, setAuthError] = useState("");
  const authenticated = adminSecret.length > 0;

  function logout() {
    sessionStorage.removeItem("adminSecret");
    setAdminSecret("");
    setSecretInput("");
    setAuthError("Not authorized. Please check your password.");
  }

  if (!authenticated) {
    return (
      <div className="login">
        <h1 className="login__title">Admin</h1>
        {authError && <p className="login__error">{authError}</p>}
        <form
          className="login__form"
          onSubmit={(e) => {
            e.preventDefault();
            setAuthError("");
            sessionStorage.setItem("adminSecret", secretInput);
            setAdminSecret(secretInput);
          }}
        >
          <input
            type="password"
            placeholder="Admin Secret"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            required
          />
          <button type="submit" className="login__btn">
            Sign In
          </button>
        </form>
      </div>
    );
  }

  return (
    <AdminErrorBoundary key={adminSecret} onAuthError={logout}>
      <AdminDashboard adminSecret={adminSecret} onLogout={() => { sessionStorage.removeItem("adminSecret"); setAdminSecret(""); }} />
    </AdminErrorBoundary>
  );
}

function AdminDashboard({ adminSecret, onLogout }: { adminSecret: string; onLogout: () => void }) {
  const [newAdminEmail, setNewAdminEmail] = useState("");

  const products = useQuery(api.admin.listProducts, { adminSecret });
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [ordersPage, setOrdersPage] = useState(0);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const ORDERS_PER_PAGE = 20;

  const orders = useQuery(
    api.admin.listOrders,
    { adminSecret, status: orderStatusFilter !== "all" ? orderStatusFilter as any : undefined },
  );
  const createProduct = useMutation(api.admin.createProduct);
  const updateProduct = useMutation(api.admin.updateProduct);
  const deleteProduct = useMutation(api.admin.deleteProduct);
  const updateOrderStatus = useMutation(api.admin.updateOrderStatus);
  const adminEmails = useQuery(api.admin.listAdminEmails, { adminSecret });
  const addAdminEmail = useMutation(api.admin.addAdminEmail);
  const removeAdminEmail = useMutation(api.admin.removeAdminEmail);
  const generateUploadUrl = useMutation(api.upload.generateUploadUrl);
  const getImageUrl = useMutation(api.upload.getUrl);

  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingDigital, setUploadingDigital] = useState(false);
  const [editingId, setEditingId] = useState<Id<"products"> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const digitalFileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadDigitalFile = useCallback(async (file: File) => {
    setUploadingDigital(true);
    const uploadUrl = await generateUploadUrl();
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const { storageId } = await result.json();
    setForm((p) => ({ ...p, downloadFileId: storageId, downloadFileName: file.name }));
    setUploadingDigital(false);
  }, [generateUploadUrl]);

  const startEdit = (p: NonNullable<typeof products>[number]) => {
    setEditingId(p._id);
    setForm({
      name: p.name,
      description: p.description,
      price: (p.price / 100).toFixed(2),
      stripePriceId: p.stripePriceId,
      category: p.category,
      stock: String(p.stock),
      productType: (p.productType as "physical" | "digital") ?? "physical",
      downloadFileId: (p.downloadFileId as string) ?? "",
      downloadFileName: p.downloadFileId ? "Uploaded file" : "",
    });
    setImageUrls(p.images || []);
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImageUrls([]);
  };

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
        productType: form.productType,
        downloadFileId: form.productType === "digital" && form.downloadFileId ? form.downloadFileId as any : undefined,
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
        productType: form.productType,
        downloadFileId: form.productType === "digital" && form.downloadFileId ? form.downloadFileId as any : undefined,
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
      <div className="admin__header">
        <h1 className="admin__title">Admin Dashboard</h1>
        <button className="admin__logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>

      <section className="admin__section">
        <h2 className="admin__section-title">
          {editingId ? "Edit Product" : "Add Product"}
        </h2>
        <form ref={formRef} onSubmit={handleSubmit} className="admin__form">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          <input placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} required />
          <input placeholder="Price (EUR, e.g. 19.99)" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} required />
          <input placeholder="Stripe Price ID (price_xxx)" value={form.stripePriceId} onChange={(e) => setForm((p) => ({ ...p, stripePriceId: e.target.value }))} required />
          <input placeholder="Category" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} required />
          {form.productType === "physical" && (
            <input placeholder="Stock" type="number" value={form.stock} onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))} required />
          )}

          <div className="admin__form-row">
            <label className="admin__label">Product Type</label>
            <div className="admin__radio-group">
              <label>
                <input
                  type="radio"
                  name="productType"
                  value="physical"
                  checked={form.productType === "physical"}
                  onChange={() => setForm((p) => ({ ...p, productType: "physical" }))}
                />
                {" "}Physical
              </label>
              <label>
                <input
                  type="radio"
                  name="productType"
                  value="digital"
                  checked={form.productType === "digital"}
                  onChange={() => setForm((p) => ({ ...p, productType: "digital" }))}
                />
                {" "}Digital
              </label>
            </div>
          </div>

          {form.productType === "digital" && (
            <>
              {form.downloadFileId ? (
                <div className="admin__file-info">
                  <span className="admin__file-name">{form.downloadFileName}</span>
                  <button
                    type="button"
                    className="admin__file-remove"
                    onClick={() => setForm((p) => ({ ...p, downloadFileId: "", downloadFileName: "" }))}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  className="admin__file-upload"
                  onClick={() => digitalFileInputRef.current?.click()}
                >
                  {uploadingDigital ? (
                    <span className="upload-zone__uploading">Uploading...</span>
                  ) : (
                    <span className="admin__file-upload-text">
                      Click to upload digital file
                    </span>
                  )}
                  <input
                    ref={digitalFileInputRef}
                    type="file"
                    hidden
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        uploadDigitalFile(e.target.files[0]);
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
              )}
            </>
          )}

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
                  <th>Type</th>
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
                    <td>€{(p.price / 100).toFixed(2)}</td>
                    <td>{p.stock}</td>
                    <td>
                      <span className={`admin__type-badge admin__type-badge--${(p.productType ?? "physical")}`}>
                        {(p.productType ?? "physical")}
                      </span>
                    </td>
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
        <div className="admin__orders-toolbar">
          <div className="admin__orders-filters">
            {["all", "paid", "shipped", "delivered", "cancelled"].map((s) => (
              <button
                key={s}
                className={`admin__filter-btn${orderStatusFilter === s ? " admin__filter-btn--active" : ""}`}
                onClick={() => { setOrderStatusFilter(s); setOrdersPage(0); }}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          {orders && (
            <span className="admin__orders-count">{orders.length} order{orders.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        {orders === undefined ? (
          <p className="loading">Loading</p>
        ) : orders.length === 0 ? (
          <p className="admin__no-orders">No orders yet.</p>
        ) : (
          <>
            <div className="admin__table-wrap">
              <table className="admin__orders-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders
                    .slice(ordersPage * ORDERS_PER_PAGE, (ordersPage + 1) * ORDERS_PER_PAGE)
                    .map((order) => {
                      const isExpanded = expandedOrderId === order._id;
                      const allDigital = order.items.every((item: any) => (item.productType ?? "physical") === "digital");
                      const orderType = allDigital ? "digital" : order.items.some((item: any) => (item.productType ?? "physical") === "digital") ? "mixed" : "physical";
                      return (
                        <Fragment key={order._id}>
                          <tr
                            className={`admin__order-row${isExpanded ? " admin__order-row--expanded" : ""}`}
                            onClick={() => setExpandedOrderId(isExpanded ? null : order._id)}
                          >
                            <td className="admin__order-id">#{order._id.slice(-8).toUpperCase()}</td>
                            <td>
                              {new Date(order.createdAt).toLocaleDateString(undefined, {
                                month: "short", day: "numeric",
                              })}
                            </td>
                            <td>{order.email}</td>
                            <td>{order.items.reduce((s: number, i: any) => s + i.quantity, 0)}</td>
                            <td>€{(order.total / 100).toFixed(2)}</td>
                            <td>
                              <span className={`admin__type-badge admin__type-badge--${orderType}`}>
                                {orderType}
                              </span>
                            </td>
                            <td>
                              <span className={`order-card__status order-card__status--${order.status}`}>
                                {order.status}
                              </span>
                            </td>
                            <td>
                              <div className="admin__table-actions" onClick={(e) => e.stopPropagation()}>
                                {order.status === "paid" && !allDigital && (
                                  <button className="admin__action-btn" onClick={() => updateOrderStatus({ adminSecret, id: order._id, status: "shipped" })}>
                                    Ship
                                  </button>
                                )}
                                {order.status === "shipped" && (
                                  <button className="admin__action-btn" onClick={() => updateOrderStatus({ adminSecret, id: order._id, status: "delivered" })}>
                                    Deliver
                                  </button>
                                )}
                                {(order.status === "paid" || order.status === "shipped") && !allDigital && (
                                  <button className="admin__delete-btn" onClick={() => { if (confirm("Cancel this order?")) updateOrderStatus({ adminSecret, id: order._id, status: "cancelled" }); }}>
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="admin__order-detail-row">
                              <td colSpan={8}>
                                <div className="order-card__columns">
                                  <div className="order-card__col">
                                    <div className="order-card__label">Items</div>
                                    <div className="order-card__items">
                                      {order.items.map((item: any, idx: number) => (
                                        <div key={idx} className="order-card__item">
                                          <span>
                                            {item.name} &times; {item.quantity}
                                            {(item.productType ?? "physical") === "digital" && (
                                              <span className="admin__type-badge admin__type-badge--digital" style={{ marginLeft: "0.5rem", fontSize: "0.6rem" }}>digital</span>
                                            )}
                                          </span>
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

                                  {order.items.some((item: any) => (item.productType ?? "physical") === "digital") && (
                                    <div className="order-card__col">
                                      <div className="order-card__label">Digital Delivery</div>
                                      {order.items
                                        .filter((item: any) => (item.productType ?? "physical") === "digital")
                                        .map((item: any, idx: number) => (
                                          <div key={idx} style={{ marginBottom: "0.5rem" }}>
                                            <div style={{ fontSize: "0.75rem", fontWeight: "bold" }}>{item.name}</div>
                                            {item.downloadFileId && (
                                              <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                                                File uploaded
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
            {orders.length > ORDERS_PER_PAGE && (
              <div className="admin__pagination">
                <button
                  disabled={ordersPage === 0}
                  onClick={() => setOrdersPage((p) => p - 1)}
                >
                  Prev
                </button>
                <span className="admin__pagination-info">
                  {ordersPage * ORDERS_PER_PAGE + 1}–{Math.min((ordersPage + 1) * ORDERS_PER_PAGE, orders.length)} of {orders.length}
                </span>
                <button
                  disabled={(ordersPage + 1) * ORDERS_PER_PAGE >= orders.length}
                  onClick={() => setOrdersPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="admin__section">
        <h2 className="admin__section-title">Admin Access</h2>
        {adminEmails === undefined ? (
          <p className="loading">Loading</p>
        ) : (
          <>
            <form
              className="admin__form"
              style={{ flexDirection: "row", maxWidth: "500px", marginBottom: "1.25rem" }}
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newAdminEmail.trim()) return;
                try {
                  await addAdminEmail({ adminSecret, email: newAdminEmail.trim() });
                  setNewAdminEmail("");
                } catch (err: any) {
                  alert(err.message ?? "Failed to add admin");
                }
              }}
            >
              <input
                placeholder="Email address"
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                required
                style={{ flex: 1 }}
              />
              <button type="submit">Add Admin</button>
            </form>

            {adminEmails.envAdmins.length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <div className="order-card__label">Seed Admins (env var)</div>
                {adminEmails.envAdmins.map((email) => (
                  <div key={email} className="admin__admin-row">
                    <span>{email}</span>
                    <span style={{ fontSize: "0.6rem", color: "var(--muted)" }}>env</span>
                  </div>
                ))}
              </div>
            )}

            {adminEmails.dbAdmins.length > 0 && (
              <div>
                <div className="order-card__label">Added Admins</div>
                {adminEmails.dbAdmins.map((admin) => (
                  <div key={admin._id} className="admin__admin-row">
                    <span>{admin.email}</span>
                    <button
                      className="admin__delete-btn"
                      style={{ fontSize: "0.55rem", padding: "0.25rem 0.6rem" }}
                      onClick={() => {
                        if (confirm(`Remove admin access for ${admin.email}?`))
                          removeAdminEmail({ adminSecret, id: admin._id });
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {adminEmails.dbAdmins.length === 0 && adminEmails.envAdmins.length === 0 && (
              <p className="admin__no-orders">No admins configured.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
