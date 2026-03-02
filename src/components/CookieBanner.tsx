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
