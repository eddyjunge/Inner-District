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
