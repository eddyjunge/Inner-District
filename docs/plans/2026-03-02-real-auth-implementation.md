# Real Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace admin secret auth with real Convex Auth (email/password + Google OAuth) for both users and admins, add user account features, and update privacy policy.

**Architecture:** Re-enable the existing `@convex-dev/auth` setup (already configured with Google + Password providers) by wrapping the frontend in `ConvexAuthProvider`. Admin functions switch from `adminSecret` parameter to `ctx.auth.getUserIdentity()` with email-list gating. New user profile and order history features added.

**Tech Stack:** @convex-dev/auth 0.0.91, @auth/core, React 19, Convex, TypeScript

---

### Task 1: Verify and Fix Environment Variables

**Files:**
- No code files changed, just environment configuration

**Step 1: Check required env vars on dev deployment**

Run: `npx convex env list`

Ensure these exist (set any missing ones):
- `SITE_URL` — must be set to the Convex HTTP actions URL (the `.site` URL, NOT the `.cloud` URL). For dev: `https://pastel-lynx-898.eu-west-1.convex.site`

Run: `npx convex env get SITE_URL` — if missing or wrong, set it:
```bash
npx convex env set SITE_URL https://pastel-lynx-898.eu-west-1.convex.site
```

**Step 2: Check required env vars on prod deployment**

```bash
npx convex env get SITE_URL --prod
```

If missing, set it:
```bash
npx convex env set SITE_URL https://sensible-terrier-443.eu-west-1.convex.site --prod
```

**Step 3: Verify JWKS and JWT_PRIVATE_KEY exist**

These are needed for Convex Auth's JWT signing. Check:
```bash
npx convex env get JWKS
npx convex env get JWKS --prod
```

If JWKS exists but JWT_PRIVATE_KEY doesn't, generate both:
```bash
node -e "
const { exportJWK, exportPKCS8, generateKeyPair } = require('jose');
(async () => {
  const keys = await generateKeyPair('RS256');
  const privateKey = await exportPKCS8(keys.privateKey);
  const publicKey = await exportJWK(keys.publicKey);
  publicKey.alg = 'RS256';
  console.log('JWT_PRIVATE_KEY:');
  console.log(privateKey);
  console.log('JWKS:');
  console.log(JSON.stringify({ keys: [{ use: 'sig', ...publicKey }] }));
})();
"
```

Then set them on both deployments.

**Step 4: Note about Google OAuth**

Google OAuth requires `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. If the user doesn't have Google OAuth credentials yet, the Password provider will still work. Check:
```bash
npx convex env get AUTH_GOOGLE_ID
npx convex env get AUTH_GOOGLE_ID --prod
```

If not set, Google sign-in button will be hidden. User can add credentials later.

**Step 5: Verify Convex Auth deploys correctly**

```bash
npx convex dev --once
```

Expected: No errors related to auth. If there are env var errors, they'll appear here.

---

### Task 2: Update Frontend Auth Provider

**Files:**
- Modify: `src/main.tsx`

**Step 1: Replace ConvexProvider with ConvexAuthProvider**

Replace the entire file with:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import App from "./App";
import "./styles.css";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
if (!CONVEX_URL) throw new Error("Missing VITE_CONVEX_URL");

const convex = new ConvexReactClient(CONVEX_URL);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexAuthProvider client={convex}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConvexAuthProvider>
  </React.StrictMode>,
);
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "feat: switch to ConvexAuthProvider for real authentication"
```

---

### Task 3: Create Login Page

**Files:**
- Create: `src/pages/Login.tsx`

**Step 1: Create the login page component**

```tsx
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Link, useNavigate, useSearchParams } from "react-router";

export default function Login() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handlePasswordAuth(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("flow", flow);
      await signIn("password", formData);
      navigate(returnTo);
    } catch (err: any) {
      setError(
        flow === "signUp"
          ? "Could not create account. Email may already be in use."
          : "Invalid email or password.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError("");
    try {
      await signIn("google", { redirectTo: returnTo });
    } catch {
      setError("Google sign-in failed.");
    }
  }

  return (
    <div className="login">
      <h1 className="login__title">
        {flow === "signIn" ? "Sign In" : "Create Account"}
      </h1>

      <form className="login__form" onSubmit={handlePasswordAuth}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        {error && <p className="login__error">{error}</p>}

        <button type="submit" className="login__btn" disabled={submitting}>
          {submitting
            ? "Loading..."
            : flow === "signIn"
              ? "Sign In"
              : "Create Account"}
        </button>
      </form>

      <div className="login__divider">
        <span>or</span>
      </div>

      <button className="login__btn login__btn--google" onClick={handleGoogle}>
        Continue with Google
      </button>

      <button
        className="login__toggle"
        onClick={() => {
          setFlow(flow === "signIn" ? "signUp" : "signIn");
          setError("");
        }}
      >
        {flow === "signIn"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/pages/Login.tsx
git commit -m "feat: add login page with email/password and Google OAuth"
```

---

### Task 4: Update Layout Header with Auth State

**Files:**
- Modify: `src/components/Layout.tsx`

**Step 1: Add auth state to header**

Replace the entire file with:

```tsx
import { Link } from "react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useCart } from "../lib/cart";
import { api } from "../../convex/_generated/api";
import CookieBanner from "./CookieBanner";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { totalItems } = useCart();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  return (
    <div>
      <header className="header">
        <Link to="/" className="header__brand">
          <img src="/logo.png" alt="" className="header__logo" />
          <span>Inner District</span>
        </Link>
        <nav className="header__nav">
          <Link to="/cart" className="header__cart-link">
            Cart
            <span className="header__cart-count">{totalItems}</span>
          </Link>
          {!isLoading && (
            isAuthenticated ? (
              <div className="header__user">
                <Link to="/account" className="header__user-link">
                  {user?.email ?? "Account"}
                </Link>
                <button className="header__logout-btn" onClick={() => void signOut()}>
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="header__auth-link">
                Sign In
              </Link>
            )
          )}
        </nav>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        <div className="footer__inner">
          <nav className="footer__links">
            <Link to="/impressum">Impressum</Link>
            <span className="footer__sep">|</span>
            <Link to="/cookies">Datenschutz &amp; Cookies</Link>
          </nav>
          <p className="footer__copy">&copy; 2026 Inner District</p>
        </div>
      </footer>
      <CookieBanner />
    </div>
  );
}
```

Note: This references `api.users.me` which will be created in Task 6. It will compile after Task 6. Don't try to compile yet.

**Step 2: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: add auth state to header (sign in/out, user email)"
```

---

### Task 5: Create User Profile Backend

**Files:**
- Create: `convex/users.ts`

**Step 1: Create user profile queries and mutations**

```ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    return {
      email: identity.email ?? "",
      name: identity.name ?? user?.name ?? "",
      savedAddress: (user as any)?.savedAddress ?? null,
      isAdmin: await isAdmin(ctx, identity.email ?? ""),
    };
  },
});

export const saveAddress = mutation({
  args: {
    address: v.object({
      name: v.string(),
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      country: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), identity.email))
      .first();

    if (user) {
      await ctx.db.patch(user._id, { savedAddress: args.address } as any);
    }
  },
});

export const myOrders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) return [];

    return await ctx.db
      .query("orders")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .order("desc")
      .collect();
  },
});

async function isAdmin(ctx: any, email: string): Promise<boolean> {
  if (!email) return false;
  const envAdmins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
  if (envAdmins.includes(email.toLowerCase())) return true;

  const dbAdmin = await ctx.db
    .query("adminEmails")
    .withIndex("by_email", (q: any) => q.eq("email", email.toLowerCase()))
    .first();
  return !!dbAdmin;
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add convex/users.ts
git commit -m "feat: add user profile queries (me, saveAddress, myOrders)"
```

---

### Task 6: Rewrite Admin Backend to Use Identity Auth

**Files:**
- Modify: `convex/admin.ts`

**Step 1: Replace the entire admin.ts**

Replace the full file with identity-based auth:

```ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function assertAdmin(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity || !identity.email) {
    throw new Error("Not authenticated");
  }
  const email = identity.email.toLowerCase();

  const envAdmins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);

  if (envAdmins.includes(email)) return;

  const dbAdmin = await ctx.db
    .query("adminEmails")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();

  if (!dbAdmin) throw new Error("Not authorized");
}

export const listProducts = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    return await ctx.db.query("products").collect();
  },
});

export const listOrders = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("paid"),
        v.literal("shipped"),
        v.literal("delivered"),
        v.literal("cancelled"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    if (args.status) {
      return await ctx.db
        .query("orders")
        .withIndex("by_status", (idx) => idx.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("orders").order("desc").collect();
  },
});

export const createProduct = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    price: v.number(),
    stripePriceId: v.string(),
    images: v.array(v.string()),
    category: v.string(),
    stock: v.number(),
    productType: v.optional(v.union(v.literal("physical"), v.literal("digital"))),
    downloadFileId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    return await ctx.db.insert("products", {
      ...args,
      isActive: true,
    });
  },
});

export const updateProduct = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    stripePriceId: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    stock: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    productType: v.optional(v.union(v.literal("physical"), v.literal("digital"))),
    downloadFileId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(id, filtered);
  },
});

export const deleteProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

export const updateOrderStatus = mutation({
  args: {
    id: v.id("orders"),
    status: v.union(
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const listAdminEmails = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    const envAdmins = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const dbAdmins = await ctx.db.query("adminEmails").collect();
    return {
      envAdmins,
      dbAdmins: dbAdmins.map((a) => ({ _id: a._id, email: a.email, addedAt: a.addedAt })),
    };
  },
});

export const addAdminEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const email = args.email.trim().toLowerCase();
    if (!email) throw new Error("Email is required");
    const existing = await ctx.db
      .query("adminEmails")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) throw new Error("Email already an admin");
    return await ctx.db.insert("adminEmails", {
      email,
      addedAt: Date.now(),
    });
  },
});

export const removeAdminEmail = mutation({
  args: { id: v.id("adminEmails") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add convex/admin.ts
git commit -m "feat: replace admin secret with identity-based auth"
```

---

### Task 7: Rewrite Admin Frontend

**Files:**
- Modify: `src/pages/Admin.tsx`

**Step 1: Rewrite Admin.tsx**

Remove the AdminErrorBoundary, AdminDashboard split, and adminSecret logic entirely. The component now:
- Checks `useConvexAuth()` for authentication — redirects to `/login?returnTo=/admin` if not logged in
- Checks `user.isAdmin` from `api.users.me` — shows "Not authorized" if not admin
- All admin API calls no longer pass `adminSecret`

The key changes to the existing Admin.tsx:
1. Remove `AdminErrorBoundary` class
2. Remove all `adminSecret` state, `sessionStorage`, `secretInput`, `authError`
3. Remove the login form — just redirect to `/login`
4. Remove `adminSecret` from all query/mutation calls
5. Remove `onLogout` prop from `AdminDashboard` — use `signOut` from auth
6. Add `useConvexAuth` + `useQuery(api.users.me)` for auth checks

The Admin export becomes:

```tsx
import { useState, useRef, useCallback, Fragment } from "react";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Navigate } from "react-router";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
```

Remove the `AdminErrorBoundary` class entirely.

The `Admin` export:

```tsx
export default function Admin() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const { signOut } = useAuthActions();

  if (isLoading) return <p className="loading">Loading</p>;
  if (!isAuthenticated) return <Navigate to="/login?returnTo=/admin" replace />;
  if (user === undefined) return <p className="loading">Loading</p>;
  if (!user?.isAdmin) {
    return (
      <div className="login">
        <h1 className="login__title">Not Authorized</h1>
        <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: "1rem" }}>
          Your account ({user?.email}) does not have admin access.
        </p>
        <button className="login__btn" onClick={() => void signOut()}>
          Sign Out
        </button>
      </div>
    );
  }

  return <AdminDashboard onLogout={() => void signOut()} />;
}
```

The `AdminDashboard` function signature changes to only take `onLogout`:

```tsx
function AdminDashboard({ onLogout }: { onLogout: () => void }) {
```

And ALL query/mutation calls inside `AdminDashboard` drop the `adminSecret` param:
- `useQuery(api.admin.listProducts, {})` (no adminSecret)
- `useQuery(api.admin.listOrders, { status: ... })` (no adminSecret)
- `useQuery(api.admin.listAdminEmails, {})` (no adminSecret)
- All mutations: `createProduct({...})`, `updateProduct({...})`, `deleteProduct({...})`, `updateOrderStatus({...})`, `addAdminEmail({...})`, `removeAdminEmail({...})` — all without adminSecret

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/pages/Admin.tsx
git commit -m "feat: admin dashboard uses real auth instead of shared secret"
```

---

### Task 8: Create Account Page

**Files:**
- Create: `src/pages/Account.tsx`

**Step 1: Create account page with order history**

```tsx
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
```

**Step 2: Commit**

```bash
git add src/pages/Account.tsx
git commit -m "feat: add account page with order history"
```

---

### Task 9: Update Checkout to Auto-Fill for Logged-In Users

**Files:**
- Modify: `src/pages/Checkout.tsx`

**Step 1: Add auto-fill from user profile**

At the top of the file, add imports:

```tsx
import { useConvexAuth } from "convex/react";
```

Inside the `Checkout` component, after the existing `useCart` hook, add:

```tsx
const { isAuthenticated } = useConvexAuth();
const userProfile = useQuery(api.users.me, isAuthenticated ? {} : "skip");
```

Add an import for `api` from `"../../convex/_generated/api"` (already exists).

Then add a `useEffect` (import `useEffect` from react) that auto-fills the form when the user profile loads:

```tsx
import { useState, useEffect } from "react";
```

After the `form` useState, add:

```tsx
const [prefilled, setPrefilled] = useState(false);

useEffect(() => {
  if (userProfile && !prefilled) {
    setForm((f) => ({
      ...f,
      email: userProfile.email || f.email,
      ...(userProfile.savedAddress
        ? {
            name: userProfile.savedAddress.name || f.name,
            line1: userProfile.savedAddress.line1 || f.line1,
            line2: userProfile.savedAddress.line2 || f.line2,
            city: userProfile.savedAddress.city || f.city,
            state: userProfile.savedAddress.state || f.state,
            postalCode: userProfile.savedAddress.postalCode || f.postalCode,
            country: userProfile.savedAddress.country || f.country,
          }
        : {}),
    }));
    setPrefilled(true);
  }
}, [userProfile, prefilled]);
```

**Step 2: Commit**

```bash
git add src/pages/Checkout.tsx
git commit -m "feat: auto-fill checkout form for logged-in users"
```

---

### Task 10: Update Routes in App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add new routes**

```tsx
import { Routes, Route } from "react-router";
import Layout from "./components/Layout";
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Success from "./pages/Success";
import Cancel from "./pages/Cancel";
import Admin from "./pages/Admin";
import Impressum from "./pages/Impressum";
import CookiePolicy from "./pages/CookiePolicy";
import Login from "./pages/Login";
import Account from "./pages/Account";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/impressum" element={<Impressum />} />
        <Route path="/cookies" element={<CookiePolicy />} />
        <Route path="/login" element={<Login />} />
        <Route path="/account" element={<Account />} />
      </Routes>
    </Layout>
  );
}
```

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add login and account routes"
```

---

### Task 11: Add CSS Styles for Auth and Account Pages

**Files:**
- Modify: `src/styles.css`

**Step 1: Append styles at end of styles.css**

The login page already has styles (`.login__title`, `.login__form`, `.login__btn`, etc.) from the existing admin login. Check they're sufficient, then add account page and header auth styles:

```css
/* ========================================
   HEADER AUTH
   ======================================== */

.header__nav {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.header__auth-link {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  border-bottom: 1px solid var(--fg);
}

.header__user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header__user-link {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--muted);
  border-bottom: 1px solid transparent;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header__user-link:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.header__logout-btn {
  font-size: 0.6rem;
  padding: 0.3rem 0.6rem;
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--muted);
}

.header__logout-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: transparent;
}

/* ========================================
   ACCOUNT PAGE
   ======================================== */

.account {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.account__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.account__title {
  font-size: 2.5rem;
}

.account__logout-btn {
  font-size: 0.65rem;
  padding: 0.4rem 0.8rem;
  background: transparent;
  border: 1px solid var(--muted);
  color: var(--muted);
}

.account__logout-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: transparent;
}

.account__section {
  margin-bottom: 2.5rem;
}

.account__section-title {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--fg);
}

.account__email {
  font-size: 0.85rem;
  color: var(--muted);
}

.account__admin-link {
  display: inline-block;
  margin-top: 0.75rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--accent);
  border-color: var(--accent);
}

.account__empty {
  color: var(--muted);
  font-size: 0.85rem;
}

.account__order {
  border: var(--border);
  padding: 1rem;
  margin-bottom: 1rem;
}

.account__order-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.account__order-id {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 0.85rem;
}

.account__order-date {
  font-size: 0.75rem;
  color: var(--muted);
}

.account__order-items {
  margin-bottom: 0.5rem;
}

.account__order-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  padding: 0.25rem 0;
}

.account__order-total {
  font-weight: 700;
  font-size: 0.85rem;
  text-align: right;
  padding-top: 0.5rem;
  border-top: 1px solid var(--fg);
}

/* Account responsive */
@media (max-width: 480px) {
  .account__title {
    font-size: 1.8rem;
  }

  .account__order-header {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}

/* Header auth responsive */
@media (max-width: 768px) {
  .header__user-link {
    display: none;
  }
}
```

**Step 2: Commit**

```bash
git add src/styles.css
git commit -m "feat: add styles for auth header, login, and account pages"
```

---

### Task 12: Update Privacy/Cookie Policy

**Files:**
- Modify: `src/pages/CookiePolicy.tsx`

**Step 1: Add auth data sections**

After the section about "Datenerfassung auf dieser Website" (section 3) and before "Bestellungen & Zahlungsabwicklung" (section 4), add a new section about authentication. Also update the existing sections to mention auth cookies/tokens.

Add after section 3 (before section 4):

```tsx
<section className="legal-page__section">
  <h2>4. Benutzerkonto &amp; Authentifizierung</h2>

  <h3>Registrierung und Anmeldung</h3>
  <p>
    Sie konnen ein Benutzerkonto erstellen, um Bestellungen zu verfolgen und Ihre
    Lieferadresse zu speichern. Bei der Registrierung verarbeiten wir:
  </p>
  <ul>
    <li><strong>E-Mail-Adresse:</strong> Zur Identifikation Ihres Kontos und fur die Kommunikation</li>
    <li><strong>Passwort:</strong> Wird verschlusselt (gehasht) gespeichert. Wir haben keinen Zugriff auf Ihr Klartext-Passwort.</li>
  </ul>

  <h3>Anmeldung uber Google</h3>
  <p>
    Sie konnen sich alternativ mit Ihrem Google-Konto anmelden. Dabei erhalten wir von Google
    Ihre E-Mail-Adresse und Ihren Namen. Es gelten zusatzlich die Datenschutzbestimmungen von
    Google:{" "}
    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
      https://policies.google.com/privacy
    </a>
  </p>

  <h3>Sitzungsverwaltung</h3>
  <p>
    Nach der Anmeldung wird ein Authentifizierungs-Token in Ihrem Browser gespeichert
    (localStorage), um Sie bei zukunftigen Besuchen angemeldet zu halten. Dieses Token
    enthalt keine personenbezogenen Daten und wird bei der Abmeldung geloscht.
  </p>

  <h3>Kontoloschung</h3>
  <p>
    Sie konnen die Loschung Ihres Benutzerkontos und aller damit verbundenen Daten jederzeit
    per E-Mail an die im Impressum genannte Adresse anfordern.
  </p>
</section>
```

Then renumber the remaining sections (old 4 becomes 5, old 5 becomes 6, etc.).

Also update the localStorage section (section 3) to add auth token:

In the `<ul>` under "Lokaler Speicher (localStorage)", add:

```tsx
<li><strong>Authentifizierung:</strong> Nach der Anmeldung wird ein Sitzungs-Token lokal gespeichert, um Sie angemeldet zu halten.</li>
```

**Step 2: Commit**

```bash
git add src/pages/CookiePolicy.tsx
git commit -m "feat: update privacy policy with auth data sections"
```

---

### Task 13: Build, Test, and Deploy

**Step 1: Type-check the full project**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Start dev server and test**

Run: `npm run dev`

Test the following:
- Visit `/login` — email/password form and Google button visible
- Sign up with email/password
- Sign out from header
- Sign in again
- Visit `/account` — see profile and order history
- Visit `/admin` — if admin email, see dashboard; if not, see "Not authorized"
- Visit `/checkout` — form auto-fills email when logged in
- Visit `/cookies` — new auth section visible

**Step 3: Deploy**

```bash
npx convex deploy --yes
git push origin main
```
