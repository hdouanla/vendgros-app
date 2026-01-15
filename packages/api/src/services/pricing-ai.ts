import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PriceRecommendation {
  suggestedPrice: number;
  priceRange: {
    min: number;
    max: number;
    optimal: number;
  };
  confidence: number; // 0-1
  reasoning: string;
  marketInsights: {
    averageMarketPrice?: number;
    competitorCount?: number;
    demandLevel: "low" | "medium" | "high";
  };
  factors: string[];
}

/**
 * Get AI-powered price recommendation for a listing
 */
export async function getPriceRecommendation(params: {
  title: string;
  description: string;
  category: string;
  quantityTotal: number;
  location?: string;
  historicalPrices?: Array<{
    price: number;
    quantitySold: number;
    daysToSell: number;
  }>;
  similarListings?: Array<{
    title: string;
    price: number;
    status: string;
  }>;
}): Promise<PriceRecommendation> {
  try {
    // Prepare context for AI
    const historicalContext =
      params.historicalPrices && params.historicalPrices.length > 0
        ? `Historical pricing data:\n${params.historicalPrices.map((h) => `- $${h.price.toFixed(2)} per piece, ${h.quantitySold} sold in ${h.daysToSell} days`).join("\n")}`
        : "No historical data available.";

    const competitorContext =
      params.similarListings && params.similarListings.length > 0
        ? `Similar listings in the area:\n${params.similarListings.map((s) => `- "${s.title}": $${s.price.toFixed(2)} (${s.status})`).join("\n")}`
        : "No similar listings found.";

    const avgMarketPrice =
      params.similarListings && params.similarListings.length > 0
        ? params.similarListings.reduce((sum, s) => sum + s.price, 0) /
          params.similarListings.length
        : undefined;

    const prompt = `You are a pricing expert for Vendgros, a bulk sales marketplace. Analyze this listing and provide optimal pricing recommendations.

LISTING DETAILS:
Title: ${params.title}
Description: ${params.description}
Category: ${params.category}
Quantity: ${params.quantityTotal} pieces
Location: ${params.location ?? "Unknown"}

MARKET DATA:
${competitorContext}

${historicalContext}

PRICING FACTORS TO CONSIDER:
1. Product freshness/perishability
2. Bulk quantity (larger quantities = lower per-piece price)
3. Market demand for category
4. Quality based on description
5. Competitive pricing
6. Seller's pricing history

Provide a JSON response with:
{
  "suggestedPrice": number,
  "priceRange": {
    "min": number,
    "max": number,
    "optimal": number
  },
  "confidence": 0-1,
  "reasoning": "brief explanation",
  "demandLevel": "low|medium|high",
  "factors": ["factor1", "factor2", ...]
}

Pricing guidelines:
- Produce: $0.50-$5 per piece
- Baked goods: $1-$8 per piece
- Dairy: $2-$10 per piece
- Bulk ingredients: $0.25-$3 per unit

Be conservative and competitive. Price to sell quickly.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content:
            "You are an expert pricing analyst. Respond only with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const aiResponse = JSON.parse(content);

    return {
      suggestedPrice: aiResponse.suggestedPrice,
      priceRange: aiResponse.priceRange,
      confidence: aiResponse.confidence,
      reasoning: aiResponse.reasoning,
      marketInsights: {
        averageMarketPrice: avgMarketPrice,
        competitorCount: params.similarListings?.length ?? 0,
        demandLevel: aiResponse.demandLevel,
      },
      factors: aiResponse.factors,
    };
  } catch (error) {
    console.error("Pricing AI error:", error);

    // Fallback to simple calculation
    const avgPrice =
      params.similarListings && params.similarListings.length > 0
        ? params.similarListings.reduce((sum, s) => sum + s.price, 0) /
          params.similarListings.length
        : 2.0; // Default fallback

    return {
      suggestedPrice: avgPrice,
      priceRange: {
        min: avgPrice * 0.8,
        max: avgPrice * 1.2,
        optimal: avgPrice,
      },
      confidence: 0.5,
      reasoning: "AI unavailable. Using market average.",
      marketInsights: {
        averageMarketPrice: avgPrice,
        competitorCount: params.similarListings?.length ?? 0,
        demandLevel: "medium",
      },
      factors: ["Market average", "Category baseline"],
    };
  }
}

/**
 * Analyze price performance and suggest adjustments
 */
export async function analyzePricePerformance(params: {
  listingId: string;
  currentPrice: number;
  daysListed: number;
  viewsCount: number;
  reservationCount: number;
  quantityRemaining: number;
  quantityTotal: number;
}): Promise<{
  performanceScore: number; // 0-1
  recommendation: "increase" | "decrease" | "maintain";
  adjustmentPercentage: number;
  reasoning: string;
}> {
  const {
    currentPrice,
    daysListed,
    viewsCount,
    reservationCount,
    quantityRemaining,
    quantityTotal,
  } = params;

  // Calculate performance metrics
  const conversionRate = viewsCount > 0 ? reservationCount / viewsCount : 0;
  const sellThroughRate =
    quantityTotal > 0 ? (quantityTotal - quantityRemaining) / quantityTotal : 0;
  const velocityScore = daysListed > 0 ? reservationCount / daysListed : 0;

  // Performance scoring
  let performanceScore = 0;
  performanceScore += conversionRate * 0.4; // 40% weight on conversion
  performanceScore += sellThroughRate * 0.4; // 40% weight on sell-through
  performanceScore += Math.min(velocityScore / 2, 1) * 0.2; // 20% weight on velocity

  // Determine recommendation
  let recommendation: "increase" | "decrease" | "maintain";
  let adjustmentPercentage = 0;
  let reasoning: string;

  if (performanceScore >= 0.7) {
    // High performance - price might be too low
    recommendation = "increase";
    adjustmentPercentage = 10; // Suggest 10% increase
    reasoning =
      "Strong demand and high conversion rate suggest room for price increase.";
  } else if (performanceScore <= 0.3) {
    // Low performance - price might be too high
    recommendation = "decrease";
    adjustmentPercentage = -15; // Suggest 15% decrease
    reasoning =
      "Low conversion rate and slow sell-through suggest price reduction needed.";
  } else {
    // Medium performance - maintain price
    recommendation = "maintain";
    adjustmentPercentage = 0;
    reasoning = "Price is performing adequately. Monitor and maintain.";
  }

  // Special cases
  if (daysListed > 7 && sellThroughRate < 0.2) {
    recommendation = "decrease";
    adjustmentPercentage = -20;
    reasoning =
      "Item has been listed for over a week with minimal sales. Significant price reduction recommended.";
  }

  if (quantityRemaining < quantityTotal * 0.2 && daysListed < 2) {
    recommendation = "increase";
    adjustmentPercentage = 15;
    reasoning =
      "Item selling very quickly. Consider raising price for remaining inventory.";
  }

  return {
    performanceScore,
    recommendation,
    adjustmentPercentage,
    reasoning,
  };
}

/**
 * Get category-specific pricing benchmarks
 */
export function getCategoryBenchmarks(category: string): {
  averagePrice: number;
  priceRange: { min: number; max: number };
  popularPricePoints: number[];
} {
  const benchmarks: Record<
    string,
    { averagePrice: number; priceRange: { min: number; max: number }; popularPricePoints: number[] }
  > = {
    produce: {
      averagePrice: 2.0,
      priceRange: { min: 0.5, max: 5.0 },
      popularPricePoints: [1.0, 1.5, 2.0, 2.5, 3.0],
    },
    bakery: {
      averagePrice: 3.5,
      priceRange: { min: 1.0, max: 8.0 },
      popularPricePoints: [2.0, 3.0, 4.0, 5.0, 6.0],
    },
    dairy: {
      averagePrice: 4.5,
      priceRange: { min: 2.0, max: 10.0 },
      popularPricePoints: [3.0, 4.0, 5.0, 6.0, 8.0],
    },
    meat: {
      averagePrice: 8.0,
      priceRange: { min: 5.0, max: 20.0 },
      popularPricePoints: [6.0, 8.0, 10.0, 12.0, 15.0],
    },
    beverages: {
      averagePrice: 2.5,
      priceRange: { min: 1.0, max: 6.0 },
      popularPricePoints: [1.5, 2.0, 2.5, 3.0, 4.0],
    },
    prepared_foods: {
      averagePrice: 5.0,
      priceRange: { min: 3.0, max: 12.0 },
      popularPricePoints: [4.0, 5.0, 6.0, 8.0, 10.0],
    },
    other: {
      averagePrice: 3.0,
      priceRange: { min: 0.5, max: 10.0 },
      popularPricePoints: [1.0, 2.0, 3.0, 4.0, 5.0],
    },
  };

  const categoryKey = category.toLowerCase().replace(/\s+/g, "_");
  return (
    benchmarks[categoryKey] ?? benchmarks.other ?? {
      averagePrice: 3.0,
      priceRange: { min: 0.5, max: 10.0 },
      popularPricePoints: [1.0, 2.0, 3.0, 4.0, 5.0],
    }
  );
}

/**
 * Calculate dynamic pricing based on time and inventory
 */
export function calculateDynamicPrice(params: {
  basePrice: number;
  hoursRemaining: number;
  quantityRemaining: number;
  quantityTotal: number;
}): {
  adjustedPrice: number;
  discountPercentage: number;
  reason: string;
} {
  const { basePrice, hoursRemaining, quantityRemaining, quantityTotal } = params;

  const sellThroughRate = (quantityTotal - quantityRemaining) / quantityTotal;
  const timeElapsedHours = 48 - hoursRemaining; // Assuming 48-hour listing window
  const timeProgressRate = timeElapsedHours / 48;

  let discountPercentage = 0;
  let reason = "No adjustment";

  // Time-based urgency pricing
  if (hoursRemaining <= 6 && quantityRemaining > quantityTotal * 0.5) {
    // Less than 6 hours left, more than 50% unsold
    discountPercentage = 25;
    reason = "Expiration approaching with high inventory";
  } else if (hoursRemaining <= 12 && quantityRemaining > quantityTotal * 0.4) {
    discountPercentage = 15;
    reason = "Limited time remaining";
  } else if (hoursRemaining <= 24 && quantityRemaining > quantityTotal * 0.6) {
    discountPercentage = 10;
    reason = "Clearing inventory before expiration";
  }

  // Inventory-based pricing
  if (quantityRemaining < quantityTotal * 0.2 && hoursRemaining > 24) {
    // Less than 20% remaining, plenty of time
    discountPercentage = -10; // Price increase
    reason = "High demand - limited inventory";
  }

  const adjustedPrice = basePrice * (1 - discountPercentage / 100);

  return {
    adjustedPrice: Math.max(adjustedPrice, basePrice * 0.5), // Never drop below 50% of base
    discountPercentage,
    reason,
  };
}
