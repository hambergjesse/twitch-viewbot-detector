// src/backend/server.ts

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path'; // Import path module
import {
    fetchChatterCountViaGQL,
    fetchViewerCount,
    sampleChattersViaIRC
} from './api/twitch';
import { analyzeViewers, AnalysisResult, MIN_VIEWERS_FOR_ANALYSIS } from './analysis/heuristics';

// Load environment variables
dotenv.config();

console.log("Backend server starting...");

const app = express();
const PORT = process.env.PORT || 3000;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;

if (!TWITCH_CLIENT_ID || !FRONTEND_ORIGIN) {
    console.error("FATAL ERROR: TWITCH_CLIENT_ID or FRONTEND_ORIGIN not found in .env file.");
    process.exit(1);
}

// --- Middleware ---
app.use(cors({
    origin: FRONTEND_ORIGIN,
    credentials: true
}));

// --- Serve Static Frontend Files ---
// Determine the correct path to the frontend directory relative to the compiled JS file
// __dirname in CommonJS points to the directory of the current file (dist/backend/)
const frontendPath = path.join(__dirname, '../../src/frontend'); 
console.log(`Serving static files from: ${frontendPath}`);
app.use(express.static(frontendPath));

// --- API Routes ---

// Simplified analysis endpoint - No login required
app.get('/analyze/:channelName', async (req: Request, res: Response): Promise<void> => {
    const { channelName } = req.params;
    console.log(`Received request to analyze channel ${channelName}`);

    let viewerCount: number | null = null;
    let chatterCountResultGQL: number | null = null;
    let chatterSampleList: string[] = [];
    let analysisResult: AnalysisResult | null = null;

    try {
        // Fetch viewer count first (essential, quick)
        viewerCount = await fetchViewerCount(channelName);

        if (viewerCount === null) {
            res.status(503).json({ error: 'Service Unavailable', details: 'Failed to fetch viewer data from Twitch API.' });
            return;
        }
        if (viewerCount === 0) {
            analysisResult = analyzeViewers(0, 0, []);
            analysisResult.insights = ["Channel appears offline or does not exist according to Twitch API."];
            res.status(200).json(analysisResult);
            return;
        }

        // Now fetch GQL count and IRC sample concurrently
        console.log('Fetching GQL count and IRC sample...');
        [chatterCountResultGQL, chatterSampleList] = await Promise.all([
            fetchChatterCountViaGQL(channelName),
            sampleChattersViaIRC(channelName)
        ]);
        console.log('GQL/IRC fetches complete.');

        // --- Perform Analysis with all data ---
        const chatterCountGQL = chatterCountResultGQL ?? 0;
        analysisResult = analyzeViewers(viewerCount, chatterCountGQL, chatterSampleList);

        console.log(`Analysis complete for ${channelName}:`, analysisResult);

        // --- Add Insights/Warnings ---
        const gqlInsights: string[] = [];
        gqlInsights.push("[EXPERIMENTAL] Chatter count obtained via internal GQL API (may be unstable/break).");
        gqlInsights.push(`[INFO] IRC sampling captured ${chatterSampleList.length} unique users during the sampling window.`);
        if (chatterCountResultGQL === null) {
            gqlInsights.push("Warning: Failed to retrieve chatter count via GQL.");
        } else if (chatterCountGQL === 0 && viewerCount >= MIN_VIEWERS_FOR_ANALYSIS) {
            gqlInsights.push("Warning: GQL returned 0 chatters despite significant viewers.");
        }
        // Compare GQL count vs IRC sample size (if both > 0)
        if (chatterCountGQL > 0 && chatterSampleList.length > 0 && chatterCountGQL > chatterSampleList.length * 2) {
            gqlInsights.push("Note: GQL chatter count is significantly higher than the IRC sample size. (IRC sample may be incomplete).")
        }
        analysisResult.insights = [...gqlInsights, ...analysisResult.insights];

        // Send the successful results
        res.status(200).json(analysisResult);

    } catch (error) {
        // Catch unexpected errors during the process
        console.error(`Unexpected error during analysis for ${channelName}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred';
        if (!res.headersSent) {
            res.status(500).json({ error: 'Analysis Failed', details: errorMessage });
        }
    }
});

// --- Optional: Fallback for SPA routing --- 
// This sends index.html for any GET request that doesn't match an API route or a static file
app.get('*', (req, res) => {
  console.log(`Fallback route hit for: ${req.originalUrl}, sending index.html`);
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
      if (err) {
          console.error("Error sending index.html:", err);
          // Avoid sending error if headers already sent (e.g., by static middleware)
          if (!res.headersSent) {
             res.status(500).send('Error serving frontend.');
          }
      }
  });
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    // Remind user to use their actual IP/domain
    console.log(`Frontend should be accessible at http://<Your_VPS_IP_or_Domain>:${PORT}`);
});

// TODO: Setup Express server
// TODO: Define API endpoints (e.g., /analyze/:channelName)
// TODO: Integrate twitch API client and analysis logic

// Example: Placeholder function call
// import { fetchChatters } from './api/twitch';
// import { analyzeViewers } from './analysis/heuristics';

async function main() {
    // Example usage (will be triggered by API calls later)
    console.log("Running placeholder main function...");
    // const chatters = await fetchChatters("example_channel");
    // const analysis = analyzeViewers(chatters, 1000); // Example viewer count
    // console.log("Placeholder Analysis:", analysis);
}

// main().catch(console.error); 