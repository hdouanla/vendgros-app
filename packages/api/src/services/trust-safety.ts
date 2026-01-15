import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface FraudDetectionResult {
  isFraudulent: boolean;
  riskScore: number; // 0-1, higher = more risky
  riskFactors: string[];
  recommendation: "allow" | "review" | "block";
  reasoning: string;
}

export interface BehaviorAnalysisResult {
  trustScore: number; // 0-100
  behaviorFlags: string[];
  patterns: {
    listingFrequency: number;
    cancellationRate: number;
    responseTime: number;
    priceConsistency: number;
  };
  recommendation: string;
}

export interface NoShowPrediction {
  probability: number; // 0-1
  confidence: number; // 0-1
  riskFactors: string[];
  preventionSuggestions: string[];
}

export interface ReviewAuthenticityResult {
  isAuthentic: boolean;
  confidence: number; // 0-1
  suspicionReasons: string[];
  aiGenerated: boolean;
  copiedFromOther: boolean;
}

/**
 * Fraud Detection System
 * Analyzes user behavior patterns to detect potential fraud
 */
export async function detectFraud(params: {
  userId: string;
  userEmail: string;
  userPhone: string;
  accountAge: number; // days
  listingsCount: number;
  completedTransactions: number;
  cancelledTransactions: number;
  noShowCount: number;
  averageListingPrice: number;
  recentActivitySpike: boolean;
  multipleAccountsDetected: boolean;
  paymentFailures: number;
  reportedByOthers: number;
}): Promise<FraudDetectionResult> {
  const riskFactors: string[] = [];
  let riskScore = 0;

  // Account age check
  if (params.accountAge < 7) {
    riskFactors.push("Account less than 7 days old");
    riskScore += 0.2;
  }

  // Activity patterns
  if (params.recentActivitySpike && params.accountAge < 30) {
    riskFactors.push("Unusual activity spike for new account");
    riskScore += 0.3;
  }

  // Transaction history
  const transactionRate =
    params.completedTransactions /
    (params.completedTransactions + params.cancelledTransactions || 1);
  if (transactionRate < 0.5 && params.listingsCount > 5) {
    riskFactors.push("High cancellation rate");
    riskScore += 0.25;
  }

  // No-show rate
  const noShowRate =
    params.noShowCount / (params.completedTransactions + params.noShowCount || 1);
  if (noShowRate > 0.3) {
    riskFactors.push(`High no-show rate (${(noShowRate * 100).toFixed(1)}%)`);
    riskScore += 0.3;
  }

  // Multiple accounts
  if (params.multipleAccountsDetected) {
    riskFactors.push("Multiple accounts detected from same device/IP");
    riskScore += 0.4;
  }

  // Payment issues
  if (params.paymentFailures > 3) {
    riskFactors.push("Multiple payment failures");
    riskScore += 0.3;
  }

  // User reports
  if (params.reportedByOthers > 0) {
    riskFactors.push(`Reported by ${params.reportedByOthers} users`);
    riskScore += 0.2 * params.reportedByOthers;
  }

  // Price anomalies
  if (params.averageListingPrice > 1000 && params.completedTransactions === 0) {
    riskFactors.push("High-value listings with no transaction history");
    riskScore += 0.25;
  }

  // Cap risk score at 1.0
  riskScore = Math.min(riskScore, 1.0);

  // Use AI for final analysis
  const aiAnalysis = await analyzeWithAI({
    riskScore,
    riskFactors,
    userMetrics: params,
  });

  let recommendation: "allow" | "review" | "block" = "allow";
  if (riskScore >= 0.8 || params.multipleAccountsDetected) {
    recommendation = "block";
  } else if (riskScore >= 0.5) {
    recommendation = "review";
  }

  return {
    isFraudulent: riskScore >= 0.7,
    riskScore,
    riskFactors,
    recommendation,
    reasoning: aiAnalysis,
  };
}

/**
 * Behavior Analysis
 * Analyzes user behavior patterns to calculate trust score
 */
export async function analyzeBehavior(params: {
  userId: string;
  accountAge: number;
  totalListings: number;
  activeListings: number;
  completedTransactions: number;
  cancelledByUser: number;
  averageResponseTime: number; // minutes
  ratingAverage: number;
  ratingCount: number;
  priceVariance: number; // 0-1, how much prices vary
  listingUpdateFrequency: number; // updates per day
}): Promise<BehaviorAnalysisResult> {
  let trustScore = 50; // Start at neutral
  const behaviorFlags: string[] = [];

  // Positive factors
  if (params.accountAge > 90) trustScore += 10;
  else if (params.accountAge > 30) trustScore += 5;

  if (params.completedTransactions > 50) trustScore += 15;
  else if (params.completedTransactions > 20) trustScore += 10;
  else if (params.completedTransactions > 5) trustScore += 5;

  if (params.ratingAverage >= 4.7 && params.ratingCount > 10) trustScore += 15;
  else if (params.ratingAverage >= 4.5 && params.ratingCount > 5) trustScore += 10;
  else if (params.ratingAverage >= 4.0 && params.ratingCount > 3) trustScore += 5;

  // Response time (faster is better)
  if (params.averageResponseTime < 30) {
    trustScore += 10;
    behaviorFlags.push("Fast responder");
  } else if (params.averageResponseTime < 120) {
    trustScore += 5;
  } else if (params.averageResponseTime > 1440) {
    // > 24 hours
    trustScore -= 10;
    behaviorFlags.push("Slow responder");
  }

  // Negative factors
  const cancellationRate =
    params.cancelledByUser /
    (params.completedTransactions + params.cancelledByUser || 1);
  if (cancellationRate > 0.3) {
    trustScore -= 15;
    behaviorFlags.push("High cancellation rate");
  } else if (cancellationRate > 0.15) {
    trustScore -= 5;
    behaviorFlags.push("Moderate cancellation rate");
  }

  // Price consistency (stable prices = trustworthy)
  if (params.priceVariance > 0.5) {
    trustScore -= 10;
    behaviorFlags.push("Inconsistent pricing");
  }

  // Too many listing updates might indicate manipulation
  if (params.listingUpdateFrequency > 5) {
    trustScore -= 5;
    behaviorFlags.push("Frequent listing modifications");
  }

  // Cap trust score 0-100
  trustScore = Math.max(0, Math.min(100, trustScore));

  // Get AI recommendation
  const recommendation = await getAIRecommendation(trustScore, behaviorFlags);

  return {
    trustScore,
    behaviorFlags,
    patterns: {
      listingFrequency: params.totalListings / Math.max(params.accountAge, 1),
      cancellationRate,
      responseTime: params.averageResponseTime,
      priceConsistency: 1 - params.priceVariance,
    },
    recommendation,
  };
}

/**
 * No-Show Prediction
 * Predicts likelihood of buyer/seller no-show based on historical patterns
 */
export async function predictNoShow(params: {
  userId: string;
  userType: "buyer" | "seller";
  historicalNoShows: number;
  totalTransactions: number;
  accountAge: number;
  ratingAverage: number;
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  distanceKm: number;
  itemValue: number;
  depositAmount: number;
  isFirstTransaction: boolean;
  responseTimeBefore: number; // minutes since last message
}): Promise<NoShowPrediction> {
  let probability = 0;
  const riskFactors: string[] = [];
  const preventionSuggestions: string[] = [];

  // Historical behavior is strongest predictor
  const historicalNoShowRate = params.historicalNoShows / (params.totalTransactions || 1);
  if (historicalNoShowRate > 0.3) {
    probability += 0.5;
    riskFactors.push(
      `High historical no-show rate (${(historicalNoShowRate * 100).toFixed(1)}%)`,
    );
    preventionSuggestions.push("Require phone confirmation before pickup");
  } else if (historicalNoShowRate > 0.1) {
    probability += 0.25;
    riskFactors.push("Moderate no-show history");
  }

  // First transaction risk
  if (params.isFirstTransaction) {
    probability += 0.2;
    riskFactors.push("First transaction on platform");
    preventionSuggestions.push("Send reminder notification 1 hour before");
  }

  // New account risk
  if (params.accountAge < 7) {
    probability += 0.15;
    riskFactors.push("Very new account");
  }

  // Low rating risk
  if (params.ratingAverage < 3.0 && params.totalTransactions > 5) {
    probability += 0.2;
    riskFactors.push("Low user rating");
  }

  // Distance risk
  if (params.distanceKm > 50) {
    probability += 0.15;
    riskFactors.push("Long distance travel required");
    preventionSuggestions.push("Confirm pickup location is correct");
  }

  // Time-based patterns
  // Late evening/night transactions have higher no-show rates
  if (params.timeOfDay >= 20 || params.timeOfDay <= 6) {
    probability += 0.1;
    riskFactors.push("Pickup scheduled during off-hours");
  }

  // Weekend patterns
  if (params.dayOfWeek === 0 || params.dayOfWeek === 6) {
    probability += 0.05;
    riskFactors.push("Weekend pickup (slightly higher no-show rate)");
  }

  // Low deposit risk (less commitment)
  const depositRatio = params.depositAmount / params.itemValue;
  if (depositRatio < 0.05) {
    probability += 0.15;
    riskFactors.push("Very low deposit relative to item value");
    preventionSuggestions.push("Consider requiring higher deposit for high-value items");
  }

  // Lack of recent communication
  if (params.responseTimeBefore > 1440) {
    // No contact in 24+ hours
    probability += 0.2;
    riskFactors.push("No recent communication");
    preventionSuggestions.push("Send confirmation request via SMS");
  }

  // Cap probability at 0-1
  probability = Math.min(probability, 1.0);

  // Confidence based on data quality
  let confidence = 0.6; // Base confidence
  if (params.totalTransactions > 10) confidence += 0.2;
  if (params.accountAge > 30) confidence += 0.1;
  if (params.historicalNoShows > 0) confidence += 0.1;

  return {
    probability,
    confidence: Math.min(confidence, 1.0),
    riskFactors,
    preventionSuggestions,
  };
}

/**
 * Review Authenticity Checker
 * Detects fake, AI-generated, or suspicious reviews
 */
export async function checkReviewAuthenticity(params: {
  reviewText: string;
  rating: number;
  reviewerId: string;
  reviewerTransactionCount: number;
  reviewerAccountAge: number;
  timeToReview: number; // hours since transaction completed
  reviewLength: number;
  reviewedUserId: string;
}): Promise<ReviewAuthenticityResult> {
  const suspicionReasons: string[] = [];
  let confidence = 0.7;

  // Check for extremely generic reviews
  const genericPhrases = [
    "great seller",
    "highly recommend",
    "fast shipping",
    "as described",
    "good communication",
  ];
  const genericCount = genericPhrases.filter((phrase) =>
    params.reviewText.toLowerCase().includes(phrase),
  ).length;

  if (genericCount >= 3 && params.reviewLength < 100) {
    suspicionReasons.push("Review is overly generic");
  }

  // Check timing
  if (params.timeToReview < 1) {
    // Reviewed within 1 hour
    suspicionReasons.push("Review submitted suspiciously fast");
  }

  // Check review length extremes
  if (params.reviewLength < 20 && params.rating === 5) {
    suspicionReasons.push("Very short positive review");
  } else if (params.reviewLength > 2000) {
    suspicionReasons.push("Unusually long review");
  }

  // New account reviews
  if (params.reviewerAccountAge < 1) {
    suspicionReasons.push("Review from brand new account");
  }

  // First-time reviewer with extreme rating
  if (params.reviewerTransactionCount === 1 && (params.rating === 1 || params.rating === 5)) {
    suspicionReasons.push("First transaction with extreme rating");
  }

  // Use OpenAI to detect AI-generated content
  try {
    const aiDetectionResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "user",
          content: `Analyze this review and determine if it appears to be:
1. AI-generated
2. Copied from another source
3. Authentic human-written feedback

Review text: "${params.reviewText}"
Rating: ${params.rating}/5

Respond in JSON format:
{
  "aiGenerated": boolean,
  "copiedContent": boolean,
  "reasoning": "brief explanation"
}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const aiAnalysis = JSON.parse(
      aiDetectionResponse.choices[0]?.message?.content ?? "{}",
    );

    if (aiAnalysis.aiGenerated) {
      suspicionReasons.push("Likely AI-generated content");
      confidence = 0.9;
    }

    if (aiAnalysis.copiedContent) {
      suspicionReasons.push("May be copied from another source");
      confidence = 0.85;
    }

    const isAuthentic = suspicionReasons.length === 0;

    return {
      isAuthentic,
      confidence,
      suspicionReasons,
      aiGenerated: aiAnalysis.aiGenerated ?? false,
      copiedFromOther: aiAnalysis.copiedContent ?? false,
    };
  } catch (error) {
    console.error("AI authenticity check failed:", error);
    // Fallback to rule-based only
    return {
      isAuthentic: suspicionReasons.length === 0,
      confidence: 0.6, // Lower confidence without AI
      suspicionReasons,
      aiGenerated: false,
      copiedFromOther: false,
    };
  }
}

/**
 * Helper: Use AI for final fraud analysis
 */
async function analyzeWithAI(params: {
  riskScore: number;
  riskFactors: string[];
  userMetrics: any;
}): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "user",
          content: `As a fraud detection expert, analyze this user profile:

Risk Score: ${(params.riskScore * 100).toFixed(1)}%
Risk Factors: ${params.riskFactors.join(", ")}

User Metrics:
- Account age: ${params.userMetrics.accountAge} days
- Completed transactions: ${params.userMetrics.completedTransactions}
- No-shows: ${params.userMetrics.noShowCount}
- Reported by others: ${params.userMetrics.reportedByOthers}

Provide a 1-2 sentence reasoning for the fraud assessment.`,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content ?? "Standard risk assessment applied.";
  } catch (error) {
    console.error("AI fraud analysis failed:", error);
    return "Automated fraud detection analysis based on platform patterns.";
  }
}

/**
 * Helper: Get AI recommendation based on trust score
 */
async function getAIRecommendation(
  trustScore: number,
  behaviorFlags: string[],
): Promise<string> {
  if (trustScore >= 80) {
    return "Highly trusted user. No restrictions needed.";
  } else if (trustScore >= 60) {
    return "Good standing. Continue monitoring behavior.";
  } else if (trustScore >= 40) {
    return "Moderate trust level. Consider additional verification for high-value transactions.";
  } else {
    return "Low trust score. Recommend manual review before approving high-value listings.";
  }
}
