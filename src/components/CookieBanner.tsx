import { useState, useEffect } from "react";
import { Link } from "react-router";
import { COOKIE_POLICY_VERSION } from "../lib/cookiePolicy";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("cookie-consent");
    if (!raw) {
      setVisible(true);
      return;
    }
    try {
      const stored = JSON.parse(raw);
      if (stored.version !== COOKIE_POLICY_VERSION) {
        setVisible(true);
      }
    } catch {
      // legacy plain-string format — re-prompt
      setVisible(true);
    }
  }, []);

  function accept(level: "all" | "essential") {
    localStorage.setItem(
      "cookie-consent",
      JSON.stringify({ level, version: COOKIE_POLICY_VERSION }),
    );
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
