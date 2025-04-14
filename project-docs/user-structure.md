# User Flow & Project Structure

## User Journey

1.  **Visit:** User opens the web application in their browser.
2.  **Input:** User enters a valid Twitch channel name into the input field.
3.  **Submit:** User clicks the "Analyze" (or similar) button.
4.  **Loading:** The application displays a loading indicator while fetching data from the Twitch API.
5.  **Results:** 
    *   **Success:** The application displays the analysis results (e.g., viewer count, potentially bot percentage if implemented).
    *   **Error:** If an error occurs (invalid channel, API issue, network problem), an appropriate error message is displayed.
6.  **Repeat (Optional):** User can enter another channel name and repeat the process.

## Data Flow

1.  **User Input:** Channel name captured from the frontend UI.
2.  **Frontend Request:** Frontend sends a request (likely to a backend endpoint, eventually) with the channel name.
3.  **(Backend - Planned):** Backend receives the request, validates the input.
4.  **(Backend - Planned):** Backend makes a call to the Twitch API using the channel name.
5.  **Twitch API Response:** Twitch API returns data (or an error) about the channel.
6.  **(Backend - Planned):** Backend processes the API response, performs analysis (e.g., bot detection logic).
7.  **Backend Response:** Backend sends the processed results (or error information) back to the frontend.
8.  **Frontend Display:** Frontend receives the response and updates the UI to show results or error messages.

*Note: Initially, the frontend might directly call the Twitch API, but a backend is planned for better security and processing.* 

## Project File Structure

```
fake-Twitch-Viewers/
├── project-docs/
│   ├── overview.md
│   ├── requirements.md
│   ├── tech-specs.md
│   ├── user-structure.md  <-- You are here
│   └── timeline.md
├── src/                 # Source code directory (planned)
│   ├── index.html       # Main HTML file
│   ├── styles.css       # CSS for styling
│   ├── script.js        # JavaScript for functionality
│   └── (potentially components/, utils/, api/ subdirectories later)
├── package.json         # Project dependencies and scripts (if using Node.js/npm)
├── README.md            # General project README 
└── .cursorrules         # Cursor AI rules (if applicable)
```

## HTML Structure (`index.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Twitch Viewbot Detector</title>
    <link rel="stylesheet" href="styles.css">
    <script type="module" src="dist/main.js" defer></script>
</head>
<body>
    <header class="app-header">
        <h1>Twitch Viewbot Detector</h1>
        <p>Enter a Twitch channel name to analyze its viewer patterns.</p>
    </header>

    <main class="container">
        <div class="input-group">
            <label for="channelName">Twitch Channel Name</label>
            <input type="text" id="channelName" placeholder="e.g., shroud" required>
        </div>
        <button id="analyzeButton">
            Analyze Channel
            <span class="loading-spinner" style="display: none;"></span>
        </button>

        <div id="results">
            <h3>Analysis Results</h3>
            <div id="results-content">
                <p>Enter a channel name and click analyze.</p>
                <!-- Results will be dynamically inserted here -->
            </div>
        </div>
    </main>

    <footer class="app-footer">
        <p>&copy; 2025 Fake Twitch Viewers Analysis Tool. MVP.</p>
    </footer>

</body>
</html>
``` 