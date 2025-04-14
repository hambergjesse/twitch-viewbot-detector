# Fake Twitch Viewers Detector

A simple web application to analyze Twitch channels and estimate viewer authenticity based on publicly available data (viewer count, chatter counts/samples) and heuristics.

**Disclaimer:** This tool uses experimental methods (like Twitch's internal GQL API and IRC sampling) and heuristics. Results are estimates and **not definitive proof** of viewbotting. Treat the results with caution.

## Features

*   Enter a Twitch channel name.
*   Fetches viewer count (via official Twitch API).
*   Fetches chatter count (via experimental GQL API).
*   Samples chatters (via IRC connection).
*   Applies heuristics based on ratios, username patterns, and discrepancies.
*   Displays an estimated authenticity percentage and insights.
*   Dark theme UI with progress bar.

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd fake-Twitch-Viewers
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Create `.env` file:** Create a `.env` file in the project root and add your Twitch API credentials:
    ```dotenv
    TWITCH_CLIENT_ID=YOUR_TWITCH_CLIENT_ID
    TWITCH_CLIENT_SECRET=YOUR_TWITCH_CLIENT_SECRET
    FRONTEND_ORIGIN=http://localhost:3000 # Or your frontend URL
    PORT=3000 # Optional backend port
    ```
    *   Get credentials from the [Twitch Developer Console](https://dev.twitch.tv/console/).

## Running the Application

1.  **Build the project:**
    ```bash
    npm run build
    ```
2.  **Run in Development Mode (with hot-reloading for backend):**
    *   Terminal 1: `npm run dev` (Starts backend server)
    *   Terminal 2: `npx serve src/frontend -l 8080` (Starts frontend server)
    *   Access at: `http://localhost:8080`
3.  **Run in Production Mode (Backend serves frontend):**
    ```bash
    npm start
    ```
    *   Access at: `http://localhost:3000` (or the configured PORT and origin)

## Project Structure

*   `src/backend/`: Node.js/Express backend code.
*   `src/frontend/`: Static HTML, CSS, and frontend TypeScript code.
*   `project-docs/`: Project planning and documentation.
*   `dist/`: Compiled backend JavaScript output.

## TODO / Future Work

*   Browser extension version.
*   Improve data source stability (evaluate GQL/IRC reliance).
*   Add backend tests.
*   Historical data tracking.
*   (See `project-docs/timeline.md` for more detail) 