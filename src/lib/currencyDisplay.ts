const LOCALE_CURRENCY_MAP: Record<string, string> = {
  "pl": "PLN",
  "sv": "SEK",
  "da": "DKK",
  "cs": "CZK",
  "hu": "HUF",
  "ro": "RON",
  "bg": "BGN",
  "en-GB": "GBP",
  "en-US": "USD",
  "en-AU": "AUD",
  "en-CA": "CAD",
  "ja": "JPY",
  "zh": "CNY",
  "ko": "KRW",
};

/**
 * Detect the user's likely currency from browser locale.
 * Returns null if the user is in a EUR country (no conversion needed).
 */
export function detectUserCurrency(): string | null {
  const locale = navigator.language;

  if (LOCALE_CURRENCY_MAP[locale]) {
    return LOCALE_CURRENCY_MAP[locale];
  }

  const lang = locale.split("-")[0];
  if (LOCALE_CURRENCY_MAP[lang]) {
    return LOCALE_CURRENCY_MAP[lang];
  }

  return null;
}

/**
 * Format a EUR cents amount with optional local currency approximation.
 * Returns: "€30.00" or "€30.00 (~139 PLN)"
 */
export function formatPrice(
  cents: number,
  rates: Record<string, number> | null,
  userCurrency: string | null,
): string {
  const eurAmount = (cents / 100).toFixed(2);
  const eurStr = `€${eurAmount}`;

  if (!userCurrency || !rates || !rates[userCurrency]) {
    return eurStr;
  }

  const converted = (cents / 100) * rates[userCurrency];
  const noDecimalCurrencies = ["JPY", "KRW", "HUF"];
  const decimals = noDecimalCurrencies.includes(userCurrency) ? 0 : 2;
  const localStr = converted.toFixed(decimals);

  return `${eurStr} (~${localStr} ${userCurrency})`;
}
