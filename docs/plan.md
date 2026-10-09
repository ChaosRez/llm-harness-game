# Plan: "The Harness" — Educational Game on LLM Harness Architecture

## Concept (locked)
An interactive web game teaching how an LLM harness works, targeted at CS / distributed-systems folks.
Core framing: **the model is a stateless compute node; the harness is the cluster orchestrator.**

- **Inner loop** (per-task agent loop): context assembly → model inference → parse tool call → execute tool → append observation → repeat until terminate/budget-exhausted. Player manages context window, tool choice, retries, token budget.
- **Outer loop** (harness/system level): task queue, subagent spawning, parallel fan-out, memory, budgets, scheduling, idempotency, backpressure, failure handling, evals.
- Game metaphor: player is the **Orchestrator** of a fleet of LLM "nodes" processing incoming user requests. Levels introduce inner-loop mechanics first, then outer-loop mechanics (parallelism, subagents, memory, rate limits, cascading failures, non-idempotent tool calls, poisoned context).
- Distributed-systems analogies used throughout: context window ≈ node memory; tokens ≈ bandwidth/budget; tool calls ≈ RPCs (may fail, need timeouts/retries); subagents ≈ worker nodes / fan-out; memory ≈ external state store; harness ≈ control plane.

## Stage 0 — Setup
- Load `vibecoding-webapp-swarm` skill; read SKILL.md + product-knowledge.md.
- Set up swarm-workspace per skill instructions.

## Stage 1 — Game Design Spec
- Orchestrator designs: level progression (5–7 levels), mechanics, teaching content per level, UI layout (dark "terminal/datacenter" aesthetic, low-saturation per default standards — avoid blue-purple gradients), copy for teaching moments.
- Deliverable: design brief passed to build subagents.

## Stage 2 — Build (webapp-building-swarm)
- React + TypeScript + Tailwind + shadcn/ui game:
  - Simulation engine: tick-based loop simulating inner loop (steps: assemble context → infer → tool call → observe) and outer loop (dispatcher, queue, agents).
  - Interactive controls: allocate context window, pick tools, spawn subagents, set budgets, retry policy.
  - Levels as progressive scenarios with win conditions + teaching tooltips ("Why did this fail?" explanations using DS terminology: timeout, idempotency, split-brain, thundering herd, etc.).
  - Sandbox mode.
- Delegate per skill's swarm pattern; main agent coordinates.

## Stage 3 — Validate & Polish
- Build passes, playtest logic (win states reachable, failure states explainable), visual check via screenshot.
- Fix issues via subagent if needed.

## Stage 4 — Deliver
- `website_version_manager` build_version (type: static).
- Respond with summary + version card.
