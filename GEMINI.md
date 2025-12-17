# Project Context: Group Survivors

## 1. Project Overview
**Group Survivors** is a multiplayer browser-based game inspired by the "survivors" genre (e.g., Vampire Survivors). It features a cooperative gameplay model where players fight waves of enemies, level up, and choose upgrades.

The project is a monorepo structure containing both the backend (Node.js/Express/Socket.io) and the frontend (React/Phaser).

## 2. Technology Stack

### Core
*   **Language:** TypeScript (Strict mode enabled)
*   **Runtime:** Node.js (Server), Browser (Client)

### Frontend (`web-client/`)
*   **Game Engine:** Phaser 3 (v3.55.2)
*   **UI Framework:** React 19
*   **State Management:** Redux Toolkit
*   **Bundler:** Parcel
*   **Communication:** Socket.io Client (with msgpack parser)

### Backend (`server/`)
*   **Server:** Node.js with Express
*   **Communication:** Socket.io Server (with msgpack parser)
*   **Execution:** `tsx` for running TypeScript directly during development.
*   **Logging:** Winston

### Shared (`common/`)
*   Contains shared types, constants, math utilities, and game logic (like QuadTree and EventSystem) reused by both client and server to ensure consistency.

### Tooling & Quality
*   **Linting/Formatting:** Biome (`@biomejs/biome`)
*   **Unit Testing:** Jest (`test-backend`)
*   **E2E Testing:** Playwright (`test`)
*   **Scripting:** Bash (for local env setup)

## 3. Directory Structure

*   **`common/`**: Shared code between client and server. Crucial for keeping game state synchronized.
    *   `constants.ts`, `types.ts`, `math.ts`: Core definitions.
    *   `EventSystem.ts`, `StateMachine.ts`: Shared architectural patterns.
*   **`server/`**: The authoritative game server.
    *   `index.ts`: Entry point.
    *   `GameServer.ts`: Main server class managing the game loop.
    *   `game-logic/`: Specific logic for bots, enemies, and player mechanics.
    *   `game-session/`: State machine for match phases (PreMatch, Match, Upgrade, End).
*   **`web-client/`**: The browser application.
    *   `index.tsx`: React entry point.
    *   `Game.ts`: Phaser game instance wrapper.
    *   `GameScene.ts`: The main Phaser scene rendering the game.
    *   `UI.tsx`: React overlay for HUD and menus.
    *   `state/`: Redux slices for UI state (health, exp, etc.).
*   **`tests/`**: Test suites.
    *   `server/`: Backend unit/integration tests (Jest).
    *   `client/`: Client logic tests.
    *   `shared/`: Tests for common utilities.
    *   `*.spec.ts`: Playwright E2E tests.

## 4. Development Workflow

### Setup
1.  Install dependencies:
    ```bash
    npm install
    # or
    npm ci
    ```

### Running Locally
The project includes a helper script that uses `tmux` to run both client and server in one terminal window:
```bash
./start-local-env.sh
```
*   **Server:** Runs on `localhost:3000` (default, inferred).
*   **Client:** Hosted by Parcel, proxies to server.

**Manual Start:**
*   **Server:** `npm run server`
*   **Client:** `npm run web-client`

### Building
*   **Client Production Build:** `npm run build-client` (Output: `server/dist`)

### Testing & Quality
*   **Backend Tests (Jest):** `npm run test-backend`
*   **E2E Tests (Playwright):** `npm test`
*   **Lint/Check:** `npm run lint`

## 5. Architecture & Patterns
*   **Authoritative Server:** The server dictates the game state. The client sends inputs/actions, and the server broadcasts state updates.
*   **State Machines:** Used extensively (e.g., `GameSessionStateMachine` on server, `ClientStateMachine` on client) to manage game flow (Menu -> Game -> Upgrade -> End).
*   **Event Driven:** `EventSystem.ts` is used for decoupling components.
*   **Hybrid Rendering:** Phaser handles the game world (entities, physics visualization), while React handles the HUD, menus, and overlay UI.

## 6. Current Roadmap (from BACKLOG.md)
*   **Refactoring Leveling:** Delaying stat gains until an "upgrade mode".
*   **State Persistence:** Saving player stats/choices between matches.
*   **Upgrade Mode:** Implementing a wave-break phase for selecting active/passive spells.
