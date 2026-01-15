/**
 * Country-Specific Regulations and Compliance
 * Handles deposit rates, taxes, and regulatory requirements by country
 */

import type { SupportedCurrency } from "./currency";

export type CountryCode = "CA" | "US" | "GB" | "MX" | "EU";

export interface CountryRegulations {
  countryCode: CountryCode;
  countryName: string;
  currency: SupportedCurrency;
  depositPercentage: number; // e.g., 0.05 for 5%
  taxRate: number; // e.g., 0.13 for 13% (HST in Ontario)
  taxName: string;
  requiresBusinessRegistration: boolean;
  privacyRegulation: string;
  minAge: number;
  phoneFormat: RegExp;
  postalCodeFormat: RegExp;
  termsUrl: string;
  privacyUrl: string;
}

const regulations: Record<CountryCode, CountryRegulations> = {
  CA: {
    countryCode: "CA",
    countryName: "Canada",
    currency: "CAD",
    depositPercentage: 0.05,
    taxRate: 0.13, // HST varies by province
    taxName: "HST",
    requiresBusinessRegistration: false,
    privacyRegulation: "PIPEDA",
    minAge: 18,
    phoneFormat: /^\+1[2-9]\d{9}$/,
    postalCodeFormat: /^[A-Z]\d[A-Z] \d[A-Z]\d$/,
    termsUrl: "https://vendgros.ca/legal/terms",
    privacyUrl: "https://vendgros.ca/legal/privacy",
  },
  US: {
    countryCode: "US",
    countryName: "United States",
    currency: "USD",
    depositPercentage: 0.1, // 10% deposit in US
    taxRate: 0.0, // Sales tax varies by state, handled separately
    taxName: "Sales Tax",
    requiresBusinessRegistration: false,
    privacyRegulation: "CCPA",
    minAge: 18,
    phoneFormat: /^\+1[2-9]\d{9}$/,
    postalCodeFormat: /^\d{5}(-\d{4})?$/,
    termsUrl: "https://vendgros.com/legal/terms",
    privacyUrl: "https://vendgros.com/legal/privacy",
  },
  GB: {
    countryCode: "GB",
    countryName: "United Kingdom",
    currency: "GBP",
    depositPercentage: 0.1, // 10% deposit
    taxRate: 0.2, // 20% VAT
    taxName: "VAT",
    requiresBusinessRegistration: true,
    privacyRegulation: "UK GDPR",
    minAge: 18,
    phoneFormat: /^\+44[1-9]\d{9,10}$/,
    postalCodeFormat:
      /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
    termsUrl: "https://vendgros.com/legal/terms-uk",
    privacyUrl: "https://vendgros.com/legal/privacy-uk",
  },
  MX: {
    countryCode: "MX",
    countryName: "Mexico",
    currency: "MXN",
    depositPercentage: 0.05,
    taxRate: 0.16, // 16% IVA
    taxName: "IVA",
    requiresBusinessRegistration: false,
    privacyRegulation: "LFPDPPP",
    minAge: 18,
    phoneFormat: /^\+52[1-9]\d{9}$/,
    postalCodeFormat: /^\d{5}$/,
    termsUrl: "https://vendgros.com/legal/terms-mx",
    privacyUrl: "https://vendgros.com/legal/privacy-mx",
  },
  EU: {
    countryCode: "EU",
    countryName: "European Union",
    currency: "EUR",
    depositPercentage: 0.1,
    taxRate: 0.21, // Average VAT across EU
    taxName: "VAT",
    requiresBusinessRegistration: true,
    privacyRegulation: "GDPR",
    minAge: 18,
    phoneFormat: /^\+[1-9]\d{1,14}$/,
    postalCodeFormat: /^[A-Z0-9 -]{3,10}$/i,
    termsUrl: "https://vendgros.com/legal/terms-eu",
    privacyUrl: "https://vendgros.com/legal/privacy-eu",
  },
};

/**
 * Get regulations for a country
 */
export function getCountryRegulations(
  countryCode: CountryCode
): CountryRegulations {
  return regulations[countryCode] ?? regulations.CA;
}

/**
 * Calculate deposit amount based on country regulations
 */
export function calculateDeposit(
  totalPrice: number,
  countryCode: CountryCode
): number {
  const regs = getCountryRegulations(countryCode);
  return Math.round(totalPrice * regs.depositPercentage * 100) / 100;
}

/**
 * Calculate tax amount based on country regulations
 */
export function calculateTax(
  subtotal: number,
  countryCode: CountryCode
): number {
  const regs = getCountryRegulations(countryCode);
  return Math.round(subtotal * regs.taxRate * 100) / 100;
}

/**
 * Validate phone number for country
 */
export function validatePhoneNumber(
  phone: string,
  countryCode: CountryCode
): boolean {
  const regs = getCountryRegulations(countryCode);
  return regs.phoneFormat.test(phone);
}

/**
 * Validate postal code for country
 */
export function validatePostalCode(
  postalCode: string,
  countryCode: CountryCode
): boolean {
  const regs = getCountryRegulations(countryCode);
  return regs.postalCodeFormat.test(postalCode);
}

/**
 * Get all supported countries
 */
export function getSupportedCountries(): CountryRegulations[] {
  return Object.values(regulations);
}

/**
 * Check if business registration is required
 */
export function requiresBusinessRegistration(
  countryCode: CountryCode
): boolean {
  return getCountryRegulations(countryCode).requiresBusinessRegistration;
}

/**
 * Get Stripe platform fee by country
 * Different countries have different Stripe fees
 */
export function getStripeFee(
  amount: number,
  countryCode: CountryCode
): number {
  const feeRates: Record<CountryCode, { percent: number; fixed: number }> = {
    CA: { percent: 0.029, fixed: 0.3 }, // 2.9% + $0.30
    US: { percent: 0.029, fixed: 0.3 }, // 2.9% + $0.30
    GB: { percent: 0.029, fixed: 0.2 }, // 2.9% + £0.20
    MX: { percent: 0.036, fixed: 3.0 }, // 3.6% + MX$3.00
    EU: { percent: 0.029, fixed: 0.25 }, // 2.9% + €0.25
  };

  const fee = feeRates[countryCode] ?? feeRates.CA;
  return Math.round((amount * fee.percent + fee.fixed) * 100) / 100;
}
