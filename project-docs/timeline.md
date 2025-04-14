# Project Timeline & Progress

## Phase 1: Foundation & Basic Web MVP (Completed)

-   [x] Setup project structure (directories, basic files).
-   [x] Create initial project documentation (`project-docs`).
-   [x] Develop basic HTML structure (`index.html`).
-   [x] Implement initial CSS styling (`styles.css`).
-   [x] Set up Node.js backend with Express.
-   [x] Implement basic Twitch API interaction (fetch viewer count).
-   [x] Implement GQL method for chatter count (experimental).
-   [x] Implement IRC sampling method for chatter list (experimental).
-   [x] Develop initial analysis heuristics (`heuristics.ts`).
-   [x] Connect frontend to backend API.
-   [x] Refine heuristics based on testing.
-   [x] Refine UI with dark theme & progress bar.
-   [x] Add basic SEO meta tags to `index.html`.
-   [x] Fix bugs related to code refactoring and build process.

## Phase 2: Enhancements & Refinements (Next Steps)

-   [ ] Connect frontend UI elements to JavaScript logic (`main.ts`).
-   [ ] Display analysis results dynamically in the UI.
-   [ ] Implement loading states and error handling in the UI.
-   [ ] Evaluate stability of GQL/IRC; potentially remove GQL if too unstable.
-   [ ] Further refine analysis heuristics based on broader testing.
-   [ ] Add unit/integration tests (backend primarily).

## Phase 3: Browser Extension

-   [ ] Research browser extension architecture (manifest, content scripts, background scripts).
-   [ ] Design extension UI (popup or overlay).
-   [ ] Adapt backend logic (or parts of it) for use within the extension.
-   [ ] Handle API calls and data display within the extension context.
-   [ ] Test extension on live Twitch pages.

## Phase 4: Advanced Features (Future Considerations)

-   [ ] Implement historical data tracking (requires database).
-   [ ] Develop trend analysis based on historical data.
-   [ ] Explore machine learning models for more sophisticated bot detection (requires significant data).
-   [ ] Consider user accounts/authentication (if needed).

## Change Records

-   *(Date)* - Initial project setup.
-   *(Date)* - Implemented backend API and basic heuristics.
-   *(Date)* - Added GQL and IRC data sources.
-   *(Date)* - Refined UI with dark theme.
-   *(Date)* - Added SEO tags.
-   *(Date)* - Fixed build/runtime bugs post-refactor.

*(Note: This is a flexible plan and priorities may shift based on findings.)* 