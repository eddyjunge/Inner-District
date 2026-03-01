// EU country codes, names, VAT rates, and shipping zones
// Prices are VAT-inclusive (brutto). VAT is extracted at checkout for display.

export const EU_COUNTRIES: Record<string, { name: string; vatRate: number; zone: "domestic" | "eu" }> = {
  DE: { name: "Germany", vatRate: 19, zone: "domestic" },
  AT: { name: "Austria", vatRate: 20, zone: "eu" },
  BE: { name: "Belgium", vatRate: 21, zone: "eu" },
  BG: { name: "Bulgaria", vatRate: 20, zone: "eu" },
  HR: { name: "Croatia", vatRate: 25, zone: "eu" },
  CY: { name: "Cyprus", vatRate: 19, zone: "eu" },
  CZ: { name: "Czech Republic", vatRate: 21, zone: "eu" },
  DK: { name: "Denmark", vatRate: 25, zone: "eu" },
  EE: { name: "Estonia", vatRate: 22, zone: "eu" },
  FI: { name: "Finland", vatRate: 25.5, zone: "eu" },
  FR: { name: "France", vatRate: 20, zone: "eu" },
  GR: { name: "Greece", vatRate: 24, zone: "eu" },
  HU: { name: "Hungary", vatRate: 27, zone: "eu" },
  IE: { name: "Ireland", vatRate: 23, zone: "eu" },
  IT: { name: "Italy", vatRate: 22, zone: "eu" },
  LV: { name: "Latvia", vatRate: 21, zone: "eu" },
  LT: { name: "Lithuania", vatRate: 21, zone: "eu" },
  LU: { name: "Luxembourg", vatRate: 17, zone: "eu" },
  MT: { name: "Malta", vatRate: 18, zone: "eu" },
  NL: { name: "Netherlands", vatRate: 21, zone: "eu" },
  PL: { name: "Poland", vatRate: 23, zone: "eu" },
  PT: { name: "Portugal", vatRate: 23, zone: "eu" },
  RO: { name: "Romania", vatRate: 19, zone: "eu" },
  SK: { name: "Slovakia", vatRate: 20, zone: "eu" },
  SI: { name: "Slovenia", vatRate: 22, zone: "eu" },
  ES: { name: "Spain", vatRate: 21, zone: "eu" },
  SE: { name: "Sweden", vatRate: 25, zone: "eu" },
};

export const SHIPPING_RATES = {
  domestic: 499,  // €4.99 in cents
  eu: 899,        // €8.99 in cents
} as const;

/** Get shipping cost in cents for a country code */
export function getShippingRate(countryCode: string): number {
  const country = EU_COUNTRIES[countryCode];
  if (!country) throw new Error(`Unsupported country: ${countryCode}`);
  return SHIPPING_RATES[country.zone];
}

/** Get VAT rate for a country code */
export function getVatRate(countryCode: string): number {
  const country = EU_COUNTRIES[countryCode];
  if (!country) throw new Error(`Unsupported country: ${countryCode}`);
  return country.vatRate;
}

/** Extract VAT amount from a VAT-inclusive (brutto) total. Returns cents. */
export function extractVat(grossCents: number, vatRate: number): number {
  return Math.round(grossCents * (vatRate / (100 + vatRate)));
}
