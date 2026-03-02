# Impressum & Cookie Compliance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add German-law-compliant Impressum page, Cookie/Privacy Policy page, cookie consent banner, and site-wide footer.

**Architecture:** Two new page components rendered via React Router, a CookieBanner component using localStorage for consent state, and a footer added to the existing Layout component. All styled with plain CSS appended to the existing `styles.css`.

**Tech Stack:** React 19, React Router 7, TypeScript, plain CSS with CSS custom properties.

---

### Task 1: Create Impressum Page

**Files:**
- Create: `src/pages/Impressum.tsx`

**Step 1: Create the Impressum page component**

```tsx
import { Link } from "react-router";

export default function Impressum() {
  return (
    <div className="legal-page">
      <Link to="/" className="legal-page__back">&larr; Zuruck zum Shop</Link>

      <h1 className="legal-page__title">Impressum</h1>

      <section className="legal-page__section">
        <h2>Angaben gemass &sect; 5 DDG</h2>
        <p>
          [DEIN VOLLSTANDIGER NAME / FIRMENNAME]<br />
          [STRASSE UND HAUSNUMMER]<br />
          [PLZ ORT]<br />
          [LAND]
        </p>
      </section>

      <section className="legal-page__section">
        <h2>Kontakt</h2>
        <p>
          Telefon: [DEINE TELEFONNUMMER]<br />
          E-Mail: [DEINE E-MAIL-ADRESSE]
        </p>
      </section>

      <section className="legal-page__section">
        <h2>Umsatzsteuer-ID</h2>
        <p>
          Umsatzsteuer-Identifikationsnummer gemass &sect; 27 a Umsatzsteuergesetz:<br />
          [DEINE UST-IDNR.]
        </p>
      </section>

      <section className="legal-page__section">
        <h2>Verantwortlich fur den Inhalt nach &sect; 18 Abs. 2 MStV</h2>
        <p>
          [DEIN NAME]<br />
          [STRASSE UND HAUSNUMMER]<br />
          [PLZ ORT]
        </p>
      </section>

      <section className="legal-page__section">
        <h2>EU-Streitschlichtung</h2>
        <p>
          Die Europaische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
          {" "}<a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
            https://ec.europa.eu/consumers/odr/
          </a>
        </p>
        <p>Unsere E-Mail-Adresse finden Sie oben im Impressum.</p>
      </section>

      <section className="legal-page__section">
        <h2>Haftung fur Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir gemass &sect; 7 Abs. 1 DDG fur eigene Inhalte auf diesen
          Seiten nach den allgemeinen Gesetzen verantwortlich. Nach &sect;&sect; 8 bis 10 DDG sind wir
          als Diensteanbieter jedoch nicht verpflichtet, ubermittelte oder gespeicherte fremde
          Informationen zu uberwachen oder nach Umstanden zu forschen, die auf eine rechtswidrige
          Tatigkeit hinweisen.
        </p>
        <p>
          Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den
          allgemeinen Gesetzen bleiben hiervon unberuhrt. Eine diesbezugliche Haftung ist jedoch
          erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung moglich. Bei
          Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend
          entfernen.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>Haftung fur Links</h2>
        <p>
          Unser Angebot enthalt Links zu externen Websites Dritter, auf deren Inhalte wir keinen
          Einfluss haben. Deshalb konnen wir fur diese fremden Inhalte auch keine Gewahr ubernehmen.
          Fur die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
          Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf
          mogliche Rechtverstosse uberpruft. Rechtswidrige Inhalte waren zum Zeitpunkt der
          Verlinkung nicht erkennbar.
        </p>
        <p>
          Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete
          Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von
          Rechtsverletzungen werden wir derartige Links umgehend entfernen.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>Urheberrecht</h2>
        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
          dem deutschen Urheberrecht. Die Vervielfaltigung, Bearbeitung, Verbreitung und jede Art
          der Verwertung ausserhalb der Grenzen des Urheberrechtes bedurfen der schriftlichen
          Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind
          nur fur den privaten, nicht kommerziellen Gebrauch gestattet.
        </p>
      </section>
    </div>
  );
}
```

**Step 2: Verify file was created**

Run: `ls src/pages/Impressum.tsx`
Expected: file exists

**Step 3: Commit**

```bash
git add src/pages/Impressum.tsx
git commit -m "feat: add Impressum page with German DDG-compliant template"
```

---

### Task 2: Create Cookie & Privacy Policy Page

**Files:**
- Create: `src/pages/CookiePolicy.tsx`

**Step 1: Create the Cookie Policy page component**

```tsx
import { Link } from "react-router";

export default function CookiePolicy() {
  return (
    <div className="legal-page">
      <Link to="/" className="legal-page__back">&larr; Zuruck zum Shop</Link>

      <h1 className="legal-page__title">Datenschutz- &amp; Cookie-Richtlinie</h1>

      <section className="legal-page__section">
        <h2>1. Datenschutz auf einen Blick</h2>
        <h3>Allgemeine Hinweise</h3>
        <p>
          Die folgenden Hinweise geben einen einfachen Uberblick daruber, was mit Ihren
          personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten
          sind alle Daten, mit denen Sie personlich identifiziert werden konnen.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>2. Verantwortliche Stelle</h2>
        <p>
          [DEIN VOLLSTANDIGER NAME / FIRMENNAME]<br />
          [STRASSE UND HAUSNUMMER]<br />
          [PLZ ORT]<br />
          E-Mail: [DEINE E-MAIL-ADRESSE]
        </p>
        <p>
          Verantwortliche Stelle ist die naturliche oder juristische Person, die allein oder
          gemeinsam mit anderen uber die Zwecke und Mittel der Verarbeitung von personenbezogenen
          Daten entscheidet.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>3. Datenerfassung auf dieser Website</h2>

        <h3>Lokaler Speicher (localStorage)</h3>
        <p>
          Diese Website verwendet den lokalen Speicher Ihres Browsers (localStorage) fur folgende
          Zwecke:
        </p>
        <ul>
          <li><strong>Warenkorb:</strong> Ihre Warenkorb-Daten werden lokal in Ihrem Browser gespeichert, damit Ihr Warenkorb zwischen Seitenaufrufen erhalten bleibt. Diese Daten werden nicht an unsere Server ubertragen.</li>
          <li><strong>Cookie-Einwilligung:</strong> Ihre Entscheidung bezuglich der Cookie-Einwilligung wird lokal gespeichert, damit das Banner nicht erneut angezeigt wird.</li>
        </ul>
        <p>
          Sie konnen die localStorage-Daten jederzeit uber die Einstellungen Ihres Browsers loschen.
        </p>

        <h3>Server-Logdateien</h3>
        <p>
          Der Provider der Seiten erhebt und speichert automatisch Informationen in sogenannten
          Server-Logdateien, die Ihr Browser automatisch an uns ubermittelt. Dies sind: Browsertyp
          und -version, verwendetes Betriebssystem, Referrer URL, Hostname des zugreifenden Rechners
          sowie Uhrzeit der Serveranfrage. Diese Daten sind nicht bestimmten Personen zuordenbar.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>4. Bestellungen &amp; Zahlungsabwicklung</h2>
        <p>
          Wenn Sie eine Bestellung aufgeben, verarbeiten wir folgende Daten:
        </p>
        <ul>
          <li>Name, E-Mail-Adresse, Lieferadresse</li>
          <li>Bestellte Produkte und Mengen</li>
          <li>Zahlungsinformationen (verarbeitet durch Stripe)</li>
        </ul>

        <h3>Stripe</h3>
        <p>
          Fur die Zahlungsabwicklung nutzen wir den Dienst <strong>Stripe</strong> (Stripe, Inc.,
          510 Townsend Street, San Francisco, CA 94103, USA). Ihre Zahlungsdaten werden direkt von
          Stripe verarbeitet und nicht auf unseren Servern gespeichert. Es gelten die
          Datenschutzbestimmungen von Stripe:{" "}
          <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer">
            https://stripe.com/de/privacy
          </a>
        </p>

        <h3>Convex</h3>
        <p>
          Fur die Speicherung von Bestelldaten und Produktinformationen nutzen wir den Dienst{" "}
          <strong>Convex</strong> (Convex, Inc.). Ihre Bestelldaten werden auf Servern von Convex
          gespeichert. Es gelten die Datenschutzbestimmungen von Convex:{" "}
          <a href="https://www.convex.dev/legal/privacy" target="_blank" rel="noopener noreferrer">
            https://www.convex.dev/legal/privacy
          </a>
        </p>
      </section>

      <section className="legal-page__section">
        <h2>5. Ihre Rechte</h2>
        <p>Sie haben jederzeit das Recht:</p>
        <ul>
          <li><strong>Auskunft</strong> uber Ihre bei uns gespeicherten personenbezogenen Daten zu erhalten (Art. 15 DSGVO)</li>
          <li><strong>Berichtigung</strong> unrichtiger Daten zu verlangen (Art. 16 DSGVO)</li>
          <li><strong>Loschung</strong> Ihrer Daten zu verlangen (Art. 17 DSGVO)</li>
          <li><strong>Einschrankung</strong> der Verarbeitung zu verlangen (Art. 18 DSGVO)</li>
          <li><strong>Datenubertragbarkeit</strong> zu verlangen (Art. 20 DSGVO)</li>
          <li><strong>Widerspruch</strong> gegen die Verarbeitung einzulegen (Art. 21 DSGVO)</li>
        </ul>
        <p>
          Zur Ausubung Ihrer Rechte kontaktieren Sie uns bitte unter der oben genannten
          E-Mail-Adresse.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>6. Beschwerderecht bei einer Aufsichtsbehorde</h2>
        <p>
          Wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer personenbezogenen Daten gegen die
          DSGVO verstosst, haben Sie das Recht, sich bei einer Datenschutz-Aufsichtsbehorde zu
          beschweren (Art. 77 DSGVO).
        </p>
      </section>

      <section className="legal-page__section">
        <h2>7. Anderung dieser Richtlinie</h2>
        <p>
          Wir behalten uns vor, diese Datenschutz- und Cookie-Richtlinie anzupassen, damit sie
          stets den aktuellen rechtlichen Anforderungen entspricht oder um Anderungen unserer
          Leistungen umzusetzen.
        </p>
        <p><em>Stand: Marz 2026</em></p>
      </section>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/pages/CookiePolicy.tsx
git commit -m "feat: add Cookie & Privacy Policy page with GDPR template"
```

---

### Task 3: Create Cookie Consent Banner

**Files:**
- Create: `src/components/CookieBanner.tsx`

**Step 1: Create the cookie banner component**

```tsx
import { useState, useEffect } from "react";
import { Link } from "react-router";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function accept(level: "all" | "essential") {
    localStorage.setItem("cookie-consent", level);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-banner">
      <p className="cookie-banner__text">
        Diese Website verwendet lokalen Speicher und essenzielle Dienste fur den Betrieb des Shops.{" "}
        <Link to="/cookies" className="cookie-banner__link">Mehr erfahren</Link>
      </p>
      <div className="cookie-banner__actions">
        <button className="cookie-banner__btn cookie-banner__btn--secondary" onClick={() => accept("essential")}>
          Nur essenzielle
        </button>
        <button className="cookie-banner__btn cookie-banner__btn--primary" onClick={() => accept("all")}>
          Akzeptieren
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/CookieBanner.tsx
git commit -m "feat: add cookie consent banner component"
```

---

### Task 4: Add Footer to Layout and Wire Up Cookie Banner

**Files:**
- Modify: `src/components/Layout.tsx`

**Step 1: Update Layout.tsx to include footer and cookie banner**

Replace the entire `Layout.tsx` content with:

```tsx
import { Link } from "react-router";
import { useCart } from "../lib/cart";
import CookieBanner from "./CookieBanner";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { totalItems } = useCart();

  return (
    <div>
      <header className="header">
        <Link to="/" className="header__brand">
          <img src="/logo.png" alt="" className="header__logo" />
          <span>Inner District</span>
        </Link>
        <nav>
          <Link to="/cart" className="header__cart-link">
            Cart
            <span className="header__cart-count">{totalItems}</span>
          </Link>
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

**Step 2: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: add footer with legal links and cookie banner to layout"
```

---

### Task 5: Add Routes for Legal Pages

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add imports and routes**

Add imports for the two new pages and add their routes:

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
      </Routes>
    </Layout>
  );
}
```

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add routes for Impressum and Cookie Policy pages"
```

---

### Task 6: Add CSS Styles

**Files:**
- Modify: `src/styles.css` (append at end, before the closing `}` of the last media query — actually append after the last media query block)

**Step 1: Append styles to styles.css**

Add the following CSS at the end of `src/styles.css`:

```css
/* ========================================
   FOOTER
   ======================================== */

.footer {
  border-top: 3px solid var(--fg);
  padding: 2rem;
  margin-top: 4rem;
}

.footer__inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.footer__links {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.footer__links a {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--muted);
  border-bottom: 1px solid transparent;
}

.footer__links a:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.footer__sep {
  color: var(--muted);
  font-size: 0.75rem;
}

.footer__copy {
  font-size: 0.7rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* ========================================
   LEGAL PAGES
   ======================================== */

.legal-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 3rem 2rem 4rem;
}

.legal-page__back {
  display: inline-block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--muted);
  border-bottom: 1px solid transparent;
  margin-bottom: 2rem;
}

.legal-page__back:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.legal-page__title {
  font-size: 2.5rem;
  margin-bottom: 2.5rem;
  border-bottom: 3px solid var(--fg);
  padding-bottom: 1rem;
}

.legal-page__section {
  margin-bottom: 2.5rem;
}

.legal-page__section h2 {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: var(--fg);
}

.legal-page__section h3 {
  font-size: 0.85rem;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  color: var(--fg);
}

.legal-page__section p {
  margin-bottom: 0.75rem;
  line-height: 1.7;
}

.legal-page__section ul {
  margin: 0.75rem 0;
  padding-left: 1.5rem;
}

.legal-page__section li {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.legal-page__section a {
  color: var(--accent);
  border-color: var(--accent);
}

/* ========================================
   COOKIE BANNER
   ======================================== */

.cookie-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--fg);
  color: var(--bg);
  padding: 1.25rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  z-index: 200;
}

.cookie-banner__text {
  font-size: 0.8rem;
  line-height: 1.5;
  flex: 1;
}

.cookie-banner__link {
  color: var(--accent);
  border-color: var(--accent);
}

.cookie-banner__actions {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
}

.cookie-banner__btn {
  font-size: 0.7rem;
  padding: 0.6rem 1.2rem;
  white-space: nowrap;
}

.cookie-banner__btn--primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.cookie-banner__btn--primary:hover {
  background: #fff;
  color: var(--fg);
  border-color: #fff;
}

.cookie-banner__btn--secondary {
  background: transparent;
  border-color: var(--bg);
  color: var(--bg);
}

.cookie-banner__btn--secondary:hover {
  background: var(--bg);
  color: var(--fg);
}

/* Cookie banner responsive */
@media (max-width: 768px) {
  .cookie-banner {
    flex-direction: column;
    text-align: center;
    padding: 1rem;
  }

  .cookie-banner__actions {
    width: 100%;
    justify-content: center;
  }
}

/* Footer responsive */
@media (max-width: 480px) {
  .footer__inner {
    flex-direction: column;
    text-align: center;
  }

  .legal-page__title {
    font-size: 1.8rem;
  }
}
```

**Step 2: Commit**

```bash
git add src/styles.css
git commit -m "feat: add styles for footer, legal pages, and cookie banner"
```

---

### Task 7: Verify Everything Works

**Step 1: Run the dev server**

Run: `npm run dev`

**Step 2: Verify in browser**

- Check `/impressum` loads with all sections
- Check `/cookies` loads with all sections
- Check footer appears on all pages with working links
- Check cookie banner appears on first visit
- Click "Akzeptieren" — banner disappears
- Clear localStorage — banner reappears
- Check mobile responsive layout

**Step 3: Final commit (if any fixes needed)**
