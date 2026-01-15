import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ModerationResult {
  approved: boolean;
  confidence: number; // 0-1
  flaggedReasons: string[];
  textAnalysis?: {
    sentiment: "positive" | "neutral" | "negative";
    spamScore: number;
    inappropriateContent: boolean;
    categories: string[];
  };
  imageAnalysis?: {
    inappropriate: boolean;
    mismatchedCategory: boolean;
    lowQuality: boolean;
    reasons: string[];
  };
}

/**
 * Analyzes listing description using OpenAI GPT-4 for content moderation
 */
export async function analyzeListingText(params: {
  title: string;
  description: string;
  category: string;
}): Promise<ModerationResult["textAnalysis"]> {
  try {
    const prompt = `You are a content moderator for Vendgros, a bulk sales marketplace. Analyze this listing and determine if it should be approved or flagged.

Title: ${params.title}
Description: ${params.description}
Category: ${params.category}

Assess the following:
1. Is this a legitimate business listing? (not spam, scam, or misleading)
2. Does the content match the category?
3. Is there any inappropriate, offensive, or prohibited content?
4. What is the overall sentiment?
5. Rate spam likelihood (0-1)

Respond in JSON format:
{
  "sentiment": "positive|neutral|negative",
  "spamScore": 0-1,
  "inappropriateContent": true|false,
  "categories": ["matches_category", "clear_description", "professional"],
  "reasoning": "brief explanation"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content:
            "You are an expert content moderator. Respond only with valid JSON.",
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

    const analysis = JSON.parse(content);

    return {
      sentiment: analysis.sentiment,
      spamScore: analysis.spamScore,
      inappropriateContent: analysis.inappropriateContent,
      categories: analysis.categories,
    };
  } catch (error) {
    console.error("Text analysis error:", error);
    // Default to manual review on error
    return {
      sentiment: "neutral",
      spamScore: 0.5,
      inappropriateContent: false,
      categories: ["requires_manual_review"],
    };
  }
}

/**
 * Analyzes listing images using OpenAI Vision API
 */
export async function analyzeListingImages(params: {
  imageUrls: string[];
  title: string;
  category: string;
}): Promise<ModerationResult["imageAnalysis"]> {
  if (params.imageUrls.length === 0) {
    return {
      inappropriate: false,
      mismatchedCategory: false,
      lowQuality: true,
      reasons: ["No images provided"],
    };
  }

  try {
    // Analyze first 3 images (to manage API costs)
    const imagesToAnalyze = params.imageUrls.slice(0, 3);

    const prompt = `You are an image content moderator for Vendgros marketplace. Analyze these images for:

Listing Title: ${params.title}
Category: ${params.category}

1. Do images show actual products/items for sale?
2. Are images clear and high quality?
3. Is there any inappropriate, offensive, or misleading content?
4. Do images match the listed category and title?
5. Are there any stock photos or stolen images (check for watermarks)?

Respond in JSON:
{
  "inappropriate": true|false,
  "mismatchedCategory": true|false,
  "lowQuality": true|false,
  "reasons": ["reason1", "reason2"],
  "confidence": 0-1
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            ...imagesToAnalyze.map((url) => ({
              type: "image_url" as const,
              image_url: {
                url,
                detail: "low" as const, // Use low detail to reduce costs
              },
            })),
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Extract JSON from response (GPT-4-vision may include extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid JSON response");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      inappropriate: analysis.inappropriate,
      mismatchedCategory: analysis.mismatchedCategory,
      lowQuality: analysis.lowQuality,
      reasons: analysis.reasons,
    };
  } catch (error) {
    console.error("Image analysis error:", error);
    // Default to manual review on error
    return {
      inappropriate: false,
      mismatchedCategory: false,
      lowQuality: false,
      reasons: ["Automatic analysis unavailable - requires manual review"],
    };
  }
}

/**
 * Comprehensive listing moderation using AI
 */
export async function moderateListing(params: {
  listingId: string;
  title: string;
  description: string;
  category: string;
  imageUrls: string[];
  sellerRating?: number;
  sellerListingsCount?: number;
}): Promise<ModerationResult> {
  // Run text and image analysis in parallel
  const [textAnalysis, imageAnalysis] = await Promise.all([
    analyzeListingText({
      title: params.title,
      description: params.description,
      category: params.category,
    }),
    analyzeListingImages({
      imageUrls: params.imageUrls,
      title: params.title,
      category: params.category,
    }),
  ]);

  // Calculate overall confidence score
  const flaggedReasons: string[] = [];
  let confidenceScore = 1.0;

  // Text checks
  if (textAnalysis.inappropriateContent) {
    flaggedReasons.push("Inappropriate content detected in description");
    confidenceScore -= 0.4;
  }

  if (textAnalysis.spamScore > 0.7) {
    flaggedReasons.push("High spam likelihood");
    confidenceScore -= 0.3;
  }

  if (textAnalysis.sentiment === "negative") {
    flaggedReasons.push("Negative sentiment detected");
    confidenceScore -= 0.1;
  }

  // Image checks
  if (imageAnalysis.inappropriate) {
    flaggedReasons.push("Inappropriate content in images");
    confidenceScore -= 0.5;
  }

  if (imageAnalysis.mismatchedCategory) {
    flaggedReasons.push("Images don't match category or description");
    confidenceScore -= 0.2;
  }

  if (imageAnalysis.lowQuality) {
    flaggedReasons.push("Low quality or missing images");
    confidenceScore -= 0.1;
  }

  // Seller reputation boost
  if (params.sellerRating && params.sellerRating >= 4.5) {
    confidenceScore += 0.1;
  }

  if (params.sellerListingsCount && params.sellerListingsCount >= 10) {
    confidenceScore += 0.05;
  }

  // Ensure confidence is between 0 and 1
  confidenceScore = Math.max(0, Math.min(1, confidenceScore));

  // Auto-approve if confidence >= 0.8 and no critical flags
  const hasCriticalFlags =
    textAnalysis.inappropriateContent || imageAnalysis.inappropriate;
  const approved = confidenceScore >= 0.8 && !hasCriticalFlags;

  return {
    approved,
    confidence: confidenceScore,
    flaggedReasons,
    textAnalysis,
    imageAnalysis,
  };
}

/**
 * Check for suspicious patterns (fraud detection)
 */
export async function detectSuspiciousPatterns(params: {
  sellerId: string;
  recentListings: Array<{
    title: string;
    description: string;
    pricePerPiece: number;
  }>;
  accountAge: number; // days
}): Promise<{
  suspicious: boolean;
  reasons: string[];
  riskScore: number; // 0-1
}> {
  const reasons: string[] = [];
  let riskScore = 0;

  // New account with many listings
  if (params.accountAge < 7 && params.recentListings.length > 5) {
    reasons.push("New account with high listing activity");
    riskScore += 0.3;
  }

  // Check for duplicate listings
  const uniqueTitles = new Set(params.recentListings.map((l) => l.title));
  if (uniqueTitles.size < params.recentListings.length * 0.5) {
    reasons.push("Multiple similar or duplicate listings");
    riskScore += 0.2;
  }

  // Check for unrealistic pricing
  const avgPrice =
    params.recentListings.reduce((sum, l) => sum + l.pricePerPiece, 0) /
    params.recentListings.length;

  if (avgPrice < 0.1 || avgPrice > 10000) {
    reasons.push("Unusual pricing detected");
    riskScore += 0.2;
  }

  // Check for common scam keywords
  const scamKeywords = [
    "wire transfer",
    "send money",
    "western union",
    "bitcoin",
    "crypto",
    "urgent",
    "act now",
    "limited time",
    "too good to be true",
  ];

  const allText = params.recentListings
    .map((l) => `${l.title} ${l.description}`)
    .join(" ")
    .toLowerCase();

  const foundKeywords = scamKeywords.filter((keyword) =>
    allText.includes(keyword),
  );

  if (foundKeywords.length > 0) {
    reasons.push(`Suspicious keywords: ${foundKeywords.join(", ")}`);
    riskScore += 0.3 * foundKeywords.length;
  }

  riskScore = Math.min(1, riskScore);

  return {
    suspicious: riskScore > 0.5,
    reasons,
    riskScore,
  };
}
