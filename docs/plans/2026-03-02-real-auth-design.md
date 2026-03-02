# Design: Real Authentication with Convex Auth

**Date:** 2026-03-02
**Status:** Approved

## Overview

Replace the admin secret-based auth with real Convex Auth (email/password + Google OAuth) for both users and admins. Add user account features (order history, saved address) and update the privacy policy.

## Requirements

- **Users:** Email/password + Google sign-in, order history, saved shipping address, track orders
- **Admins:** Same login flow as users, admin access gated by email list (env var + DB table)
- **Privacy:** Update cookie/privacy policy to cover auth data

## Architecture

### Authentication Backend

Fix and re-enable `@convex-dev/auth` which is already installed and partially configured:
- `convex/auth.ts` - Google + Password providers (exists)
- `convex/schema.ts` - authTables spread (exists)
- `convex/http.ts` - auth HTTP routes (exists)
- Ensure SITE_URL and auth env vars are correctly set on both deployments

### Frontend Auth

- Replace `ConvexProvider` with `ConvexAuthProvider` in `main.tsx`
- Create `/login` page with email/password + Google OAuth + sign-up toggle
- Header: show user email + logout when authenticated, "Sign In" link when not
- Protected routes redirect to `/login` with return URL

### Admin Access

- Remove `adminSecret` parameter from ALL admin functions in `convex/admin.ts`
- Admin functions use `ctx.auth.getUserIdentity()` to get user email
- Check email against `ADMIN_EMAILS` env var + `adminEmails` DB table
- `/admin` page: check if user is both authenticated AND admin-listed
- Keep `adminEmails` table for dynamic admin management

### User Account Features

- `/account` page - profile info, saved shipping address
- `/account/orders` page - order history filtered by user email
- Schema: add optional `userId` field to orders table
- Checkout: auto-fill email + saved address when logged in
- New `convex/users.ts` for user profile queries/mutations (save address)

### Privacy Policy Update

Add sections to `CookiePolicy.tsx`:
- Authentication data (email, hashed password, Google profile)
- Session/token management
- Account deletion process
- Third-party: Google OAuth data sharing

## Files to Create/Modify

### Backend (Convex)
- **Modify:** `convex/auth.ts` - verify providers config
- **Modify:** `convex/admin.ts` - replace adminSecret with identity-based auth
- **Modify:** `convex/schema.ts` - add user profile fields, userId on orders
- **Create:** `convex/users.ts` - user profile queries/mutations
- **Modify:** `convex/orders.ts` - add user-specific order queries

### Frontend
- **Modify:** `src/main.tsx` - ConvexAuthProvider
- **Create:** `src/pages/Login.tsx` - shared login/signup page
- **Create:** `src/pages/Account.tsx` - user account + order history
- **Modify:** `src/components/Layout.tsx` - auth state in header
- **Modify:** `src/pages/Admin.tsx` - remove AdminSecret, use identity
- **Modify:** `src/pages/Checkout.tsx` - auto-fill from saved profile
- **Modify:** `src/pages/CookiePolicy.tsx` - add auth data sections
- **Modify:** `src/App.tsx` - add new routes
- **Modify:** `src/styles.css` - login page, account page styles

### Environment
- Verify/set `SITE_URL` on both dev and prod Convex deployments
- Set Google OAuth credentials (AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET) if not already set
