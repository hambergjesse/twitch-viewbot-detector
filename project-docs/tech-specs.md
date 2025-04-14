# Technical Specifications

## Tech Stack

- **Frontend:** HTML, CSS, TypeScript (`src/frontend/main.ts`)
    - API URL: Dynamically set using `window.location.origin`
    - Build: Compiled using `tsc` (output in `src/frontend`)
- **Backend:** Node.js, Express (`src/backend/server.ts`)
    - Build: Compiled using `tsc` (output in `dist/backend`)
- **API:** Twitch API (Helix, GQL, IRC via `tmi.js`)
- **Configuration:** `dotenv` for development, environment variables for production.
- **Deployment (Suggestion):** VPS with Nginx/Caddy (Reverse Proxy) + PM2 (Process Manager)

## Development Methods

- **Version Control:** Git
- **Project Management:** Documentation-driven (using `project-docs`)
- **Testing:** (TBD - unit/integration tests)

## Coding Standards

- Follow standard conventions for HTML, CSS, TypeScript.
- Use meaningful variable and function names.
- Keep functions focused and modular.
- Add comments for complex logic.
- TypeScript strict mode enabled.

## Database Design

- Currently no database. Data is fetched live from Twitch API. 