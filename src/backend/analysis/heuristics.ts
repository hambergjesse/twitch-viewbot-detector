// src/backend/analysis/heuristics.ts

// Define a simple structure for the analysis results
export interface AnalysisResult {
    realPercentage: number;
    fakePercentage: number;
    chatterCountGQL: number;
    chatterSampleIRCSize: number;
    viewerCount: number;
    insights: string[];
}

// Constants for heuristic weights (tunable)
const LOW_CHAT_RATIO_THRESHOLD = 0.04;  // Lowered slightly
const HIGH_CHAT_RATIO_THRESHOLD = 0.90; // Increased slightly
const LOW_RATIO_SUSPICION_SCORE = 0.7;  // Suspicion assigned for low ratio
const HIGH_RATIO_SUSPICION_SCORE = 0.6; // Suspicion assigned for high ratio
const MID_RATIO_SUSPICION_SCORE = 0.1;  // Base suspicion for ratios in the middle
const ZERO_CHATTER_SUSPICION_SCORE = 0.75; // Suspicion if GQL returns 0/null despite viewers
export const MIN_VIEWERS_FOR_ANALYSIS = 30;    // Increased slightly

// Suspicion Scores (0.0 = Low, 1.0 = High)
const SUSPICION = {
    VERY_LOW: 0.05, // Ratio looks good
    LOW: 0.15,      // Ratio slightly off or small stream
    MEDIUM: 0.4,    // Ratio moderately suspicious
    HIGH: 0.75,     // Ratio very suspicious / GQL failed
    VERY_HIGH: 0.9, // Extremely high/low ratio on large stream
} as const;

// Additional constants for username/discrepancy analysis
const SUSPICIOUS_USERNAME_WEIGHT_IRC = 0.3; // Weight for % of suspicious names in IRC sample
const GQL_IRC_DISCREPANCY_THRESHOLD = 3.0; // GQL count > 3x IRC sample size
const GQL_IRC_DISCREPANCY_BOOST = 0.1;  // Suspicion boost if discrepancy is large

// Additional constants
const MIN_IRC_SAMPLE_FOR_USER_ANALYSIS = 15; // Need at least 15 users in sample for username analysis

/**
 * Analyzes viewer/chatter counts (GQL Experimental) & IRC sample for viewbot indicators.
 * @param viewerCount Viewer count (Helix).
 * @param chatterCountGQL Chatter count (GQL - Experimental, 0 if failed).
 * @param chatterSampleList Sample list of usernames from IRC.
 * @returns An AnalysisResult object.
 */
export const analyzeViewers = (
    viewerCount: number,
    chatterCountGQL: number,
    chatterSampleList: string[]
): AnalysisResult => {
    const chatterSampleIRCSize = chatterSampleList.length;
    console.log(`Analyzing GQL count ${chatterCountGQL}, IRC sample size ${chatterSampleIRCSize}, and ${viewerCount} viewers...`);
    let suspicionScore: number = SUSPICION.LOW;
    const insights: string[] = [];

    // --- Handle Edge Cases ---
    if (viewerCount <= 0) {
        insights.push("Stream appears to be offline (0 viewers).");
        suspicionScore = 0.0;
    } else if (viewerCount < MIN_VIEWERS_FOR_ANALYSIS) {
        insights.push(`Viewer count (${viewerCount}) is below threshold (${MIN_VIEWERS_FOR_ANALYSIS}) for reliable ratio analysis.`);
        // Keep default low suspicion score for small streams
    } else {
        // --- Perform Ratio Analysis (using GQL count if available) ---
        const effectiveChatterCount = chatterCountGQL > 0 ? chatterCountGQL : chatterSampleIRCSize;
        
        if (effectiveChatterCount <= 0) {
            insights.push("Chatter count unavailable (GQL failed/0 and IRC sample empty), while viewer count significant. Cannot perform ratio analysis. Assuming high suspicion.");
            suspicionScore = SUSPICION.HIGH;
        } else {
            const ratio = effectiveChatterCount / viewerCount;
            const ratioPercent = (ratio * 100).toFixed(1);

            if (ratio < LOW_CHAT_RATIO_THRESHOLD) {
                insights.push(`Suspiciously low chat activity ratio (${ratioPercent}%).`);
                suspicionScore = viewerCount > 1000 ? SUSPICION.VERY_HIGH : SUSPICION.HIGH;
            } else if (ratio > HIGH_CHAT_RATIO_THRESHOLD) {
                insights.push(`Unusually high chat activity ratio (${ratioPercent}%). While possibly legitimate, it can sometimes indicate chat bots or count issues.`);
                suspicionScore = SUSPICION.MEDIUM;
            } else {
                insights.push(`Chatter ratio (${ratioPercent}%) appears within expected range.`);
                suspicionScore = SUSPICION.VERY_LOW; // Ratio looks good
            }
        }

        // --- IRC Sample Analysis (Username Patterns) ---
        if (chatterSampleIRCSize >= MIN_IRC_SAMPLE_FOR_USER_ANALYSIS) {
            let suspiciousIrcUserCount = 0;
            // Refined Regex: Focus on name+number patterns, numbers only, generic bot words
            const botLikePattern = /^(?=.*[a-zA-Z])(?=.*[0-9])[a-zA-Z0-9_]{6,}$|^\d{7,}$|^(bot|viewer|stream)s?[_0-9]*$/i;
            const anonUserPattern = /^justinfan\d+$/i; // Pattern for anonymous tmi.js users

            let analyzedUserCount = 0;
            chatterSampleList.forEach(username => {
                // Ignore anonymous users
                if (anonUserPattern.test(username)) return;
                
                analyzedUserCount++; // Count users actually analyzed
                if (botLikePattern.test(username)) {
                    suspiciousIrcUserCount++;
                }
            });

            if (analyzedUserCount > 0 && suspiciousIrcUserCount > 0) {
                const suspiciousRate = suspiciousIrcUserCount / analyzedUserCount;
                insights.push(`Found ${suspiciousIrcUserCount} (${(suspiciousRate * 100).toFixed(0)}% of analyzed sample) potentially bot-like usernames in the IRC sample (sample size: ${chatterSampleIRCSize}).`);
                suspicionScore += suspiciousRate * SUSPICIOUS_USERNAME_WEIGHT_IRC;
            } else if (analyzedUserCount > 0) {
                 insights.push(`Username patterns in the IRC sample (size: ${chatterSampleIRCSize}) appear generally normal.`);
            } else {
                insights.push(`Could not perform meaningful username analysis on the IRC sample (size: ${chatterSampleIRCSize}) after filtering.`);
            }
        } else {
            insights.push(`IRC sample size (${chatterSampleIRCSize}) too small for reliable username pattern analysis (threshold: ${MIN_IRC_SAMPLE_FOR_USER_ANALYSIS}).`);
        }

        // --- GQL Count vs IRC Sample Size Discrepancy ---
        // Only add discrepancy suspicion boost if the IRC sample was also reasonably large
        if (chatterCountGQL > 0 && chatterSampleIRCSize >= MIN_IRC_SAMPLE_FOR_USER_ANALYSIS && 
            chatterCountGQL > chatterSampleIRCSize * GQL_IRC_DISCREPANCY_THRESHOLD) {
            insights.push("Note: GQL chatter count is significantly higher than IRC sample size. This might indicate many lurkers or an incomplete IRC sample.");
            suspicionScore += GQL_IRC_DISCREPANCY_BOOST;
        }
    }

    // --- Calculate Percentages based on Suspicion Score ---
    suspicionScore = Math.max(0, Math.min(suspicionScore, 1.0)); // Clamp 0-1

    let estimatedFake = Math.round(viewerCount * suspicionScore);
    estimatedFake = Math.min(estimatedFake, viewerCount);
    const estimatedReal = Math.max(0, viewerCount - estimatedFake);

    const realPercentage = viewerCount > 0 ? Math.round((estimatedReal / viewerCount) * 100) : 100;
    const fakePercentage = 100 - realPercentage;

    // --- Add Final Summary Insight ---
    let summaryInsight = "Low suspicion of view botting based on available data.";
    if (fakePercentage >= 85) {
        summaryInsight = "Extremely high suspicion of view botting based on available data.";
    } else if (fakePercentage >= 65) {
        summaryInsight = "High suspicion of view botting based on available data.";
    } else if (fakePercentage >= 40) {
        summaryInsight = "Moderate suspicion of view botting.";
    } else if (fakePercentage >= 20) {
        summaryInsight = "Some indicators suggesting potential view botting.";
    }
    insights.push(summaryInsight);

    return {
        realPercentage,
        fakePercentage,
        chatterCountGQL,
        chatterSampleIRCSize,
        viewerCount,
        insights
    };
}; 