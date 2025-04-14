// src/backend/api/twitch.ts
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import tmi from 'tmi.js';

// Load environment variables from .env file
dotenv.config();

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    console.error('FATAL ERROR: TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET not found in .env file.');
    // In a real app, you might want to exit or throw a more specific error
    process.exit(1);
}

// --- Keep App Access Token logic (for fetchViewerCount) ---
interface TwitchTokenResponse { access_token: string; expires_in: number; token_type: string; }
let cachedToken: { token: string; expiresAt: number } | null = null;
const getTwitchAccessToken = async (): Promise<string> => {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) return cachedToken.token;
    console.log('Fetching new Twitch App Access Token...');
    const tokenUrl = 'https://id.twitch.tv/oauth2/token';
    const params = new URLSearchParams();
    params.append('client_id', TWITCH_CLIENT_ID!);
    params.append('client_secret', TWITCH_CLIENT_SECRET!);
    params.append('grant_type', 'client_credentials');
    try {
        const response = await fetch(tokenUrl, { method: 'POST', body: params });
        if (!response.ok) throw new Error(`Twitch token request failed: ${response.status}`);
        const data = (await response.json()) as TwitchTokenResponse;
        cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
        console.log('Successfully fetched and cached new Twitch token.');
        return cachedToken.token;
    } catch (error) {
        console.error('Error fetching Twitch access token:', error);
        cachedToken = null;
        throw new Error('Could not obtain Twitch access token.');
    }
};

// --- GQL Constants (Use with caution!) ---
const GQL_ENDPOINT = 'https://gql.twitch.tv/gql';
const GQL_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko'; // Hardcoded Client ID from Twitch Web

// --- IRC Sampling ---
const IRC_SAMPLING_DURATION_MS = 30000; // 30 seconds

// --- API Functions ---

/**
 * [EXPERIMENTAL/UNSTABLE] Attempts to fetch chatter COUNT via Twitch's internal GQL endpoint.
 * WARNING: Uses undocumented APIs & hardcoded Client ID. May break or violate ToS.
 * @param channelName The login name of the Twitch channel.
 * @returns A promise resolving to the chatter count, or null if error/unavailable.
 */
export const fetchChatterCountViaGQL = async (channelName: string): Promise<number | null> => {
    const query = `
        query GetChannelChattersCount($name: String!) {
            channel(name: $name) {
                chatters {
                    count
                }
            }
        }`;
    const variables = { name: channelName };

    console.log(`[EXPERIMENTAL] Attempting to fetch chatter count via GQL for ${channelName}...`);

    try {
        const response = await fetch(GQL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Client-ID': GQL_CLIENT_ID, // Using the hardcoded web Client ID
                'Content-Type': 'application/json',
                // 'Authorization': `OAuth YOUR_TOKEN` // Likely needed for many queries, but we don't have a user token
            },
            body: JSON.stringify({
                query,
                variables,
            }),
        });

        if (!response.ok) {
            // GQL often returns 200 OK even on logical errors, need to check body
            console.warn(`[EXPERIMENTAL] GQL request for ${channelName} failed with status: ${response.status}`);
            // Try to log body for more info
            try { console.warn(`[EXPERIMENTAL] GQL Error Body: ${await response.text()}`); } catch { /* ignore */ }
            return null;
        }

        const result = await response.json();

        if (result.errors) {
            console.warn(`[EXPERIMENTAL] GQL query for ${channelName} returned errors:`, result.errors);
            return null;
        }

        const count = result?.data?.channel?.chatters?.count;

        if (typeof count === 'number') {
            console.log(`[EXPERIMENTAL] Found ${count} chatters via GQL for ${channelName}.`);
            return count;
        } else {
            console.warn(`[EXPERIMENTAL] GQL response structure unexpected or count missing for ${channelName}. Response:`, JSON.stringify(result));
            return null;
        }

    } catch (error) {
        console.error(`[EXPERIMENTAL] Error fetching GQL chatters for ${channelName}:`, error);
        return null;
    }
};

/**
 * Fetches the viewer count for a given Twitch channel using the Helix API (App Token).
 * @param channelName The name of the Twitch channel.
 * @returns A promise resolving to the viewer count (or 0 if offline or error).
 */
export const fetchViewerCount = async (channelName: string): Promise<number> => {
    const accessToken = await getTwitchAccessToken();
    const url = `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channelName)}`;
    console.log(`Fetching viewer count from Helix: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'Client-ID': TWITCH_CLIENT_ID!,
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Twitch Helix streams request failed: ${response.status}`);
        }

        const data = await response.json();

        if (data?.data?.length > 0) {
            const viewerCount = data.data[0].viewer_count;
            console.log(`Viewer count for ${channelName}: ${viewerCount}`);
            return viewerCount;
        } else {
            console.log(`Stream ${channelName} appears to be offline or not found via Helix.`);
            return 0;
        }

    } catch (error) {
        console.error(`Error fetching viewer count for ${channelName}:`, error);
        return 0;
    }
};

/**
 * Connects to Twitch IRC anonymously for a short duration to sample chatters.
 * Collects usernames from initial NAMES list and subsequent JOIN events.
 * WARNING: Sample will likely be incomplete, especially for large channels.
 * @param channelName The login name of the channel to sample.
 * @returns A promise resolving to an array (sample) of unique chatter usernames.
 */
export const sampleChattersViaIRC = (channelName: string): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        console.log(`[IRC] Starting chatter sampling for #${channelName} (${IRC_SAMPLING_DURATION_MS}ms)...`);
        const uniqueChatters = new Set<string>();
        let samplingTimeout: NodeJS.Timeout | null = null;

        const client = new tmi.Client({
            options: { debug: false }, // Set true for verbose IRC logs
            connection: {
                secure: true,
                reconnect: false // Don't reconnect for this short-lived sampling client
            },
            identity: {}, // Anonymous connection
            channels: [channelName.toLowerCase()]
        });

        const cleanupAndResolve = (result: string[]) => {
            if (samplingTimeout) clearTimeout(samplingTimeout);
            client.disconnect().catch(err => console.warn("[IRC] Error during disconnect:", err));
            console.log(`[IRC] Sampling complete for #${channelName}. Sample size: ${result.length}`);
            resolve(result);
        };

        // --- Event Listeners ---

        // Listen for the list of users currently in chat when we join
        client.on('names' as any, (channel: string, names: string[]) => {
            if (channel === `#${channelName.toLowerCase()}`) {
                console.log(`[IRC] Received initial NAMES list for ${channel} (Count: ${names.length})`);
                names.forEach((name: string) => uniqueChatters.add(name));
            }
        });

        // Listen for users joining the channel during the sample window
        client.on('join', (channel: string, username: string, self: boolean) => {
            if (!self && channel === `#${channelName.toLowerCase()}`) {
                uniqueChatters.add(username);
            }
        });

        // Handle connection errors
        client.on('disconnected', (reason: string) => {
            console.warn(`[IRC] Disconnected from #${channelName}: ${reason}`);
            // Resolve with whatever we collected, even if disconnected early
            cleanupAndResolve(Array.from(uniqueChatters));
        });

        client.on('connected', (address: string, port: number) => {
            console.log(`[IRC] Connected to ${address}:${port} for #${channelName}`);
            // Start the sampling timer ONLY after successful connection
            samplingTimeout = setTimeout(() => {
                console.log(`[IRC] Sampling duration ended for #${channelName}.`);
                cleanupAndResolve(Array.from(uniqueChatters));
            }, IRC_SAMPLING_DURATION_MS);
        });

        // --- Connect and Start ---
        client.connect().catch(err => {
            console.error(`[IRC] Connection error for #${channelName}:`, err);
            // If connection fails entirely, resolve with empty array
            cleanupAndResolve([]);
        });
    });
}; 