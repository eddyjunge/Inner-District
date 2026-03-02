# Design: Impressum & Cookie Compliance

**Date:** 2026-03-02
**Status:** Approved

## Overview

Add German-law-compliant Impressum and Cookie/Privacy Policy pages, a cookie consent banner, and a site-wide footer to the Inner District e-commerce store.

## Jurisdiction

German TMG/DDG (Telemediengesetz / Digitale-Dienste-Gesetz) and EU GDPR.

## Components

### 1. Impressum Page (`/impressum`)

German-language legal notice containing:
- Angaben gemass DDG (name, address, contact)
- Umsatzsteuer-ID placeholder
- Verantwortlich fur den Inhalt
- Haftungsausschluss (liability disclaimer for content and links)

All fields use placeholder templates (e.g., `[YOUR COMPANY NAME]`) for the user to fill in.

### 2. Cookie & Privacy Policy Page (`/cookies`)

German-language policy covering:
- What data is collected: localStorage (cart), Convex (orders/accounts), Stripe (payments)
- Purpose of each data storage mechanism
- Third-party services disclosure (Stripe, Convex)
- User rights under GDPR (access, deletion, portability, complaint to supervisory authority)
- Contact information for data inquiries

### 3. Cookie Consent Banner

Fixed-bottom banner on first visit:
- Brief explanation of essential storage usage
- Two buttons: "Akzeptieren" (accept all) and "Nur essenzielle" (essential only)
- Link to full cookie policy
- Consent stored in `localStorage` (key: `cookie-consent`)
- Does not reappear after user makes a choice

### 4. Footer Component

Added to `Layout.tsx`, visible on every page:
- Links: Impressum | Cookie-Richtlinie
- Copyright notice
- Minimal styling matching existing design system

### 5. Routing

New routes in `App.tsx`:
- `/impressum` -> `<Impressum />`
- `/cookies` -> `<CookiePolicy />`

## Styling

- Matches existing design system: Syne headings, DM Mono body, `--fg`/`--bg`/`--accent`/`--muted` variables
- Legal pages use `.legal-page` container with readable max-width
- Footer uses muted colors, small font, top border
- Cookie banner: dark background, accent-colored primary button, fixed to bottom

## Files to Create/Modify

- **Create:** `src/pages/Impressum.tsx`
- **Create:** `src/pages/CookiePolicy.tsx`
- **Create:** `src/components/CookieBanner.tsx`
- **Modify:** `src/components/Layout.tsx` (add footer + cookie banner)
- **Modify:** `src/App.tsx` (add routes)
- **Modify:** `src/styles.css` (add footer, legal page, cookie banner styles)
