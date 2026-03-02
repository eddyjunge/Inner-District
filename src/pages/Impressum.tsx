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
