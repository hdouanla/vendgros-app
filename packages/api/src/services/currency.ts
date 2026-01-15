/**
 * Currency Service for Multi-Currency Support
 * Handles currency conversion, exchange rates, and display
 */

export type SupportedCurrency = "CAD" | "USD" | "EUR" | "GBP" | "MXN";

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  CAD: "C$",
  USD: "$",
  EUR: "€",
  GBP: "£",
  MXN: "MX$",
};

export const CURRENCY_NAMES: Record<SupportedCurrency, string> = {
  CAD: "Canadian Dollar",
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  MXN: "Mexican Peso",
};

// Exchange rates (base: CAD)
// In production, fetch from API like exchangerate-api.com or Open Exchange Rates
let exchangeRates: Record<SupportedCurrency, number> = {
  CAD: 1.0,
  USD: 0.71,
  EUR: 0.66,
  GBP: 0.57,
  MXN: 12.8,
};

/**
 * Fetch latest exchange rates from API
 * Uses exchangerate-api.com (free tier: 1,500 requests/month)
 */
export async function updateExchangeRates(): Promise<void> {
  try {
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/CAD`
    );
    const data = await response.json();

    if (data.rates) {
      exchangeRates = {
        CAD: 1.0,
        USD: data.rates.USD ?? 0.71,
        EUR: data.rates.EUR ?? 0.66,
        GBP: data.rates.GBP ?? 0.57,
        MXN: data.rates.MXN ?? 12.8,
      };
    }
  } catch (error) {
    console.error("Failed to update exchange rates:", error);
    // Keep using cached rates on failure
  }
}

/**
 * Get current exchange rates
 */
export function getExchangeRates(): Record<SupportedCurrency, number> {
  return { ...exchangeRates };
}

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency
): number {
  if (fromCurrency === toCurrency) return amount;

  // Convert to CAD first (base currency)
  const amountInCAD = amount / exchangeRates[fromCurrency];

  // Then convert to target currency
  const convertedAmount = amountInCAD * exchangeRates[toCurrency];

  return Math.round(convertedAmount * 100) / 100; // Round to 2 decimals
}

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency,
  locale?: string
): string {
  const formatter = new Intl.NumberFormat(locale ?? "en-CA", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

/**
 * Get currency for country code
 */
export function getCurrencyForCountry(countryCode: string): SupportedCurrency {
  const countryToCurrency: Record<string, SupportedCurrency> = {
    CA: "CAD",
    US: "USD",
    GB: "GBP",
    MX: "MXN",
    // EU countries
    DE: "EUR",
    FR: "EUR",
    IT: "EUR",
    ES: "EUR",
    NL: "EUR",
    BE: "EUR",
    AT: "EUR",
    IE: "EUR",
    PT: "EUR",
    FI: "EUR",
    GR: "EUR",
  };

  return countryToCurrency[countryCode.toUpperCase()] ?? "CAD";
}

/**
 * Validate currency amount
 */
export function isValidCurrencyAmount(amount: number): boolean {
  return (
    typeof amount === "number" &&
    !isNaN(amount) &&
    isFinite(amount) &&
    amount >= 0
  );
}

/**
 * Get exchange rate between two currencies
 */
export function getExchangeRate(
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency
): number {
  if (fromCurrency === toCurrency) return 1.0;

  const rateToCAD = 1 / exchangeRates[fromCurrency];
  const rateToTarget = exchangeRates[toCurrency];

  return rateToCAD * rateToTarget;
}
