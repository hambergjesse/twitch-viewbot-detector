// src/frontend/main.ts

// AnalysisResult interface definition (ensure it matches backend: realPercentage, fakePercentage, chatterCountGQL, chatterSampleIRCSize, viewerCount, insights, error?, details?)
interface AnalysisResult { 
    realPercentage: number;
    fakePercentage: number;
    chatterCountGQL: number; 
    chatterSampleIRCSize: number; 
    viewerCount: number;
    insights: string[];
    error?: string;
    details?: string;
}

// --- UI element selection ---
const channelInput = document.getElementById('channelName') as HTMLInputElement | null;
const analyzeButton = document.getElementById('analyzeButton') as HTMLButtonElement | null;
const resultsContentDiv = document.getElementById('results-content') as HTMLDivElement | null;
const progressContainer = document.getElementById('progress-container') as HTMLDivElement | null;
const progressBar = document.getElementById('progress-bar') as HTMLDivElement | null;
const progressText = document.getElementById('progress-text') as HTMLSpanElement | null;
const loadingSpinner = analyzeButton?.querySelector('.loading-spinner') as HTMLElement | null;

// Backend API URL (ensure this is correct)
// const API_BASE_URL = 'http://localhost:3000'; // DEV ONLY
const API_BASE_URL = window.location.origin; // Dynamically use the current domain (e.g., https://twitch.brckt.me or http://localhost:3000)

// Helper function for formatting numbers
function numberWithCommas(x: number): string {
    if (x === null || x === undefined) return 'N/A';
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// --- Progress Bar Logic ---
let progressInterval: NodeJS.Timeout | null = null;
const ESTIMATED_ANALYSIS_TIME_MS = 35000; // Slightly less than worst case (30s IRC + buffer)
const PROGRESS_UPDATE_INTERVAL_MS = 100; 

const updateProgressBar = (startTime: number) => {
    if (!progressBar || !progressText) return;
    const elapsedTime = Date.now() - startTime;
    let progressPercent = Math.min(100, (elapsedTime / ESTIMATED_ANALYSIS_TIME_MS) * 100);
    
    // Make it look like it finishes a bit slower towards the end
    if (progressPercent > 85) {
        progressPercent = 85 + (progressPercent - 85) * 0.5; 
    }
    progressPercent = Math.min(99, progressPercent); // Don't hit 100% until done
    
    progressBar.style.width = `${progressPercent.toFixed(1)}%`;
    progressText.textContent = `Analyzing... ${Math.round(progressPercent)}%`;
};

const startProgressBar = () => {
    if (!progressContainer || !progressBar || !progressText || progressInterval) return;
    console.log("Starting progress bar...");
    
    progressBar.style.width = '0%'; // Reset
    progressText.textContent = 'Analyzing... 0%';
    progressContainer.style.display = 'block';
    if (resultsContentDiv) resultsContentDiv.innerHTML = ''; // Clear previous results/message

    const startTime = Date.now();
    updateProgressBar(startTime); // Initial update
    progressInterval = setInterval(() => updateProgressBar(startTime), PROGRESS_UPDATE_INTERVAL_MS);
};

const stopProgressBar = (isSuccess: boolean) => {
    if (!progressContainer || !progressBar || !progressText) return;
    console.log("Stopping progress bar...");
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    // Final state
    if (isSuccess) {
        progressBar.style.width = '100%';
        progressText.textContent = 'Complete!';
        // Hide progress bar after a short delay to show completion
        setTimeout(() => {
            if (progressContainer) progressContainer.style.display = 'none';
        }, 800);
    } else {
        // On error, just hide it immediately
        progressContainer.style.display = 'none';
    }
};

// --- Loading State Function ---
const setLoadingState = (isLoading: boolean, success: boolean | null = null) => {
    if (!analyzeButton || !channelInput || !loadingSpinner) return;
    
    if (isLoading) {
        analyzeButton.disabled = true;
        channelInput.disabled = true;
        loadingSpinner.style.display = 'inline-block';
        startProgressBar();
    } else {
        analyzeButton.disabled = false;
        channelInput.disabled = false;
        loadingSpinner.style.display = 'none';
        stopProgressBar(success === true); // Stop progress bar, indicating success/failure
    }
};

// --- Analysis Function ---
const handleAnalysis = async () => {
    if (!channelInput || !analyzeButton || !resultsContentDiv) {
        console.error("Required UI elements not found!");
        return;
    }

    const channelName = channelInput.value.trim();
    if (!channelName) {
        resultsContentDiv.innerHTML = '<p class="error-text">Please enter a channel name.</p>';
        return;
    }

    let analysisSuccess = false;
    setLoadingState(true);

    try {
        const apiUrl = `${API_BASE_URL}/analyze/${encodeURIComponent(channelName)}`;
        console.log(`Fetching: ${apiUrl}`);
        const response = await fetch(apiUrl);

        const data: AnalysisResult = await response.json();

        if (!response.ok) {
            // Use error message from backend if available, otherwise generic
            throw new Error(data.error || `Request failed: ${response.status} ${response.statusText}`);
        }

        analysisSuccess = true; // Mark success before processing results
        console.log("Analysis successful:", data);
        
        // --- Display successful results ---
        // (Logic for this will go here in the next step)
        resultsContentDiv.innerHTML = ""; // Clear loading message

        // Build HTML for results (example structure)
        let resultHtml = '';

        // Add Warnings/Info Texts
        const warnings = data.insights.filter(msg => msg.startsWith("Warning:") || msg.startsWith("[INFO]") || msg.startsWith("Note:") || msg.startsWith("[EXPERIMENTAL]"));
        warnings.forEach(warning => {
            // Clean up prefixes for display
            const displayWarning = warning
                .replace("[EXPERIMENTAL] ", "Note: ")
                .replace("[INFO] ", "")
                .replace("Warning: ", "")
                .replace("Note: ", ""); 
            resultHtml += `<p class="warning-text">${displayWarning}</p>`;
        });

        // Add Core Data
        resultHtml += `<p><strong>Viewer Count (Helix):</strong> ${numberWithCommas(data.viewerCount)}</p>`;
        resultHtml += `<p><strong>Chatter Count (GQL):</strong> ${numberWithCommas(data.chatterCountGQL)} <span style="font-size:0.8em;">(Experimental)</span></p>`;
        resultHtml += `<p><strong>Chatters Sampled (IRC):</strong> ${numberWithCommas(data.chatterSampleIRCSize)} <span style="font-size:0.8em;">(During ~30s window)</span></p>`;
        
        // Add Summary Percentage
        resultHtml += `
            <div class="result-summary">
                <p>
                    <span class="real">~${data.realPercentage}% Likely Real</span> /
                    <span class="suspicious">~${data.fakePercentage}% Suspicious</span>
                </p>
            </div>`;
        
        // Add Analysis Insights
        const analysisInsights = data.insights.filter(msg => !msg.startsWith("[") && !msg.startsWith("Note:") && !msg.startsWith("Warning:"));
        if (analysisInsights.length > 0) {
            resultHtml += '<h4>Analysis Insights:</h4>';
            resultHtml += '<ul>';
            analysisInsights.forEach(insight => {
                resultHtml += `<li>${insight}</li>`;
            });
            resultHtml += '</ul>';
        } else {
            resultHtml += '<p>No specific analysis insights provided.</p>';
        }

        resultsContentDiv.innerHTML = resultHtml;
        
        // --- End display logic ---

    } catch (error) {
        analysisSuccess = false; // Mark failure
        console.error('Error fetching analysis:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        if (resultsContentDiv) {
            resultsContentDiv.innerHTML = `<p class="error-text"><strong>Error:</strong> ${errorMessage}</p>`;
        }
    } finally {
        setLoadingState(false, analysisSuccess); // Pass success status to loading state
    }
};

// --- Event Listeners & Initialization ---

if (analyzeButton) {
    analyzeButton.addEventListener('click', handleAnalysis);
} else {
    console.error("Analyze button not found!");
}

if (channelInput) {
    channelInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            handleAnalysis();
        }
    });
} else {
    console.error("Channel input not found!");
}

// Optional: Add initial message if needed
// if (resultsContentDiv) {
//    resultsContentDiv.innerHTML = '<p>Enter a channel name above and click Analyze.</p>';
// }

console.log('Frontend script loaded.'); 