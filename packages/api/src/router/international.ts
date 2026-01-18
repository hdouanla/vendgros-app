import { z } from "zod/v4";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import {
  convertCurrency,
  formatCurrency,
  getExchangeRates,
  getCurrencyForCountry,
  updateExchangeRates,
  type SupportedCurrency,
  CURRENCY_NAMES,
  CURRENCY_SYMBOLS,
} from "../services/currency";
import {
  getCountryRegulations,
  calculateDeposit,
  calculateTax,
  validatePhoneNumber,
  validatePostalCode,
  getSupportedCountries,
  getStripeFee,
  type CountryCode,
} from "../services/country-regulations";

/**
 * International Expansion Router
 * Handles multi-currency, country regulations, and international features
 */
export const internationalRouter = createTRPCRouter({
  /**
   * Get current exchange rates (public)
   */
  getExchangeRates: publicProcedure.query(async () => {
    const rates = getExchangeRates();

    return {
      baseCurrency: "CAD" as SupportedCurrency,
      rates,
      lastUpdated: new Date(),
    };
  }),

  /**
   * Convert currency amount
   */
  convertCurrency: publicProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        fromCurrency: z.enum(["CAD", "USD", "EUR", "GBP", "MXN"]),
        toCurrency: z.enum(["CAD", "USD", "EUR", "GBP", "MXN"]),
      }),
    )
    .query(async ({ input }) => {
      const convertedAmount = convertCurrency(
        input.amount,
        input.fromCurrency,
        input.toCurrency,
      );

      return {
        originalAmount: input.amount,
        originalCurrency: input.fromCurrency,
        convertedAmount,
        convertedCurrency: input.toCurrency,
        formattedAmount: formatCurrency(convertedAmount, input.toCurrency),
      };
    }),

  /**
   * Get supported countries and their regulations
   */
  getSupportedCountries: publicProcedure.query(async () => {
    const countries = getSupportedCountries();

    return countries.map((country) => ({
      code: country.countryCode,
      name: country.countryName,
      currency: country.currency,
      depositPercentage: country.depositPercentage,
      taxRate: country.taxRate,
      taxName: country.taxName,
      minAge: country.minAge,
      privacyRegulation: country.privacyRegulation,
    }));
  }),

  /**
   * Get country regulations
   */
  getCountryRegulations: publicProcedure
    .input(
      z.object({
        countryCode: z.enum(["CA", "US", "GB", "MX", "EU"]),
      }),
    )
    .query(async ({ input }) => {
      const regulations = getCountryRegulations(input.countryCode);

      return {
        country: regulations.countryName,
        currency: regulations.currency,
        depositPercentage: regulations.depositPercentage,
        taxRate: regulations.taxRate,
        taxName: regulations.taxName,
        requiresBusinessRegistration: regulations.requiresBusinessRegistration,
        privacyRegulation: regulations.privacyRegulation,
        minAge: regulations.minAge,
        termsUrl: regulations.termsUrl,
        privacyUrl: regulations.privacyUrl,
      };
    }),

  /**
   * Calculate deposit for country
   */
  calculateDeposit: publicProcedure
    .input(
      z.object({
        totalPrice: z.number().positive(),
        countryCode: z.enum(["CA", "US", "GB", "MX", "EU"]),
      }),
    )
    .query(async ({ input }) => {
      const deposit = calculateDeposit(input.totalPrice, input.countryCode);
      const regulations = getCountryRegulations(input.countryCode);

      return {
        depositAmount: deposit,
        depositPercentage: regulations.depositPercentage,
        currency: regulations.currency,
        formattedDeposit: formatCurrency(deposit, regulations.currency),
      };
    }),

  /**
   * Calculate tax for country
   */
  calculateTax: publicProcedure
    .input(
      z.object({
        subtotal: z.number().positive(),
        countryCode: z.enum(["CA", "US", "GB", "MX", "EU"]),
      }),
    )
    .query(async ({ input }) => {
      const tax = calculateTax(input.subtotal, input.countryCode);
      const regulations = getCountryRegulations(input.countryCode);

      return {
        taxAmount: tax,
        taxRate: regulations.taxRate,
        taxName: regulations.taxName,
        currency: regulations.currency,
        formattedTax: formatCurrency(tax, regulations.currency),
        totalWithTax: input.subtotal + tax,
      };
    }),

  /**
   * Validate phone number for country
   */
  validatePhoneNumber: publicProcedure
    .input(
      z.object({
        phone: z.string(),
        countryCode: z.enum(["CA", "US", "GB", "MX", "EU"]),
      }),
    )
    .query(async ({ input }) => {
      const isValid = validatePhoneNumber(input.phone, input.countryCode);

      return {
        isValid,
        phone: input.phone,
        countryCode: input.countryCode,
      };
    }),

  /**
   * Validate postal code for country
   */
  validatePostalCode: publicProcedure
    .input(
      z.object({
        postalCode: z.string(),
        countryCode: z.enum(["CA", "US", "GB", "MX", "EU"]),
      }),
    )
    .query(async ({ input }) => {
      const isValid = validatePostalCode(input.postalCode, input.countryCode);

      return {
        isValid,
        postalCode: input.postalCode,
        countryCode: input.countryCode,
      };
    }),

  /**
   * Get currency for country
   */
  getCurrencyForCountry: publicProcedure
    .input(
      z.object({
        countryCode: z.string().length(2),
      }),
    )
    .query(async ({ input }) => {
      const currency = getCurrencyForCountry(input.countryCode);

      return {
        countryCode: input.countryCode,
        currency,
        currencyName: CURRENCY_NAMES[currency],
        currencySymbol: CURRENCY_SYMBOLS[currency],
      };
    }),

  /**
   * Get Stripe fee for country
   */
  getStripeFee: publicProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        countryCode: z.enum(["CA", "US", "GB", "MX", "EU"]),
      }),
    )
    .query(async ({ input }) => {
      const fee = getStripeFee(input.amount, input.countryCode);
      const regulations = getCountryRegulations(input.countryCode);

      return {
        feeAmount: fee,
        currency: regulations.currency,
        formattedFee: formatCurrency(fee, regulations.currency),
        netAmount: input.amount - fee,
      };
    }),

  /**
   * Update exchange rates (admin only)
   * Should be called via cron job daily
   */
  updateExchangeRates: protectedProcedure.mutation(async ({ ctx }) => {
    // Check if user is admin
    const currentUser = await ctx.db.query.user.findFirst({
      where: (users: any, { eq }: any) => eq(users.id, ctx.session.user.id),
    });

    if (!currentUser || !currentUser.isAdmin) {
      throw new Error("Admin access required");
    }

    await updateExchangeRates();

    return {
      success: true,
      message: "Exchange rates updated successfully",
      rates: getExchangeRates(),
    };
  }),

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies: publicProcedure.query(async () => {
    const currencies: SupportedCurrency[] = ["CAD", "USD", "EUR", "GBP", "MXN"];

    return currencies.map((currency) => ({
      code: currency,
      name: CURRENCY_NAMES[currency],
      symbol: CURRENCY_SYMBOLS[currency],
    }));
  }),

  /**
   * Format currency for display
   */
  formatCurrency: publicProcedure
    .input(
      z.object({
        amount: z.number(),
        currency: z.enum(["CAD", "USD", "EUR", "GBP", "MXN"]),
        locale: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const formatted = formatCurrency(
        input.amount,
        input.currency,
        input.locale,
      );

      return {
        amount: input.amount,
        currency: input.currency,
        formatted,
      };
    }),
});
