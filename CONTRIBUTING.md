# Contributing to THE_HARNESS

Thank you for your interest in contributing to **THE_HARNESS**! This project is an open-source educational game and simulation designed to teach LLM harness and agent architecture through distributed systems analogies.

We welcome contributions of all kinds: new educational scenarios, distributed systems analogies, bug fixes, UI/UX polish, and documentation improvements.

---

## Development Workflow

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- `npm` (v10+)

### Setup
1. Fork and clone the repository:
   ```bash
   git clone https://github.com/<your-username>/llm-harness-game.git
   cd llm-harness-game
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. Verify build and types:
   ```bash
   npm run build
   ```

---

## Project Structure

```
├── docs/                     # Design documentation & educational specifications
├── public/                   # Static assets, hero images, and favicons
├── src/
│   ├── components/           # Reusable UI components & shadcn primitives
│   ├── game/                 # Core simulation engine & game configuration
│   │   ├── engine.ts         # Deterministic tick-based simulation loop
│   │   ├── levels.config.ts  # Level parameters, request specs, win conditions
│   │   ├── postmortems.ts    # Systems failure definitions & mitigations
│   │   ├── prng.ts           # Seedable PRNG for reproducible runs
│   │   ├── sound.ts          # WebAudio sound generator
│   │   └── types.ts          # Core TypeScript interfaces
│   ├── lib/                  # State persistence, level progression & utilities
│   ├── pages/                # Game views: Home, Levels, Play, Sandbox, Field Manual
│   ├── App.tsx               # Route definitions
│   └── main.tsx              # Application entry point
├── package.json
└── vite.config.ts
```

---

## Guidelines for New Incidents / Levels

If you are proposing a new incident scenario:
1. **Grounded in Distributed Systems**: Every incident should map a real LLM harness challenge (context saturation, flaky tool RPCs, prompt injection, cascading retries) to an established systems failure mode.
2. **Clear Win Condition & Mitigations**: The player should have actionable architectural levers (circuit breakers, compaction, write validation, allocator tuning) to stabilize the system.
3. **Educational Postmortem**: Include an explanation in `postmortems.ts` linking the failure signature to real-world mitigation strategies.

---

## Submitting Pull Requests

1. Create a feature branch: `git checkout -b feature/my-new-level`.
2. Commit your changes with clear, descriptive commit messages.
3. Push to your branch and open a Pull Request against `main`.
4. Describe the educational purpose and any systems mechanics introduced or changed.
