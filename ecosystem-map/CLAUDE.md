# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Pond0maTrix" — an interactive atlas + workflow builder for the Pond0x × TRiX launch pipeline, rendered on React Flow canvases. It is a self-contained Vite sub-app inside the pond-scout repo: it has its own `package.json`/`node_modules`, and the parent repo's zero-runtime-dependency rule does **not** apply here. Run all commands from this directory. The parent scanner is covered by the root `../CLAUDE.md`.

Two views, switched in `src/App.tsx` via the `?view=` URL param:

1. **Atlas** (default) — a read-only ecosystem/strategy map: static cards, zones, and edges declared in data.
2. **Workflow** (`?view=workflow`) — an editable automation-pipeline canvas (`src/features/workflow-canvas/`): drag nodes, draw validated connections, undo/redo, auto-layout, simulated runs.

## Commands

```bash
npm run dev      # Vite dev server with HMR
npm run build    # tsc -b (project refs) + vite build -> dist/
npm run lint     # oxlint (config: .oxlintrc.json)
npm run preview  # serve the built dist/
```

There are no tests.

## Architecture

Stack: Vite + React 19 + TypeScript + Tailwind v4 (via `@tailwindcss/vite`, no tailwind.config — theme lives in CSS) + React Flow (`@xyflow/react`) + zustand/zundo (workflow state + undo) + `@dagrejs/dagre` (auto-layout) + lucide-react icons.

## Atlas view

`src/App.tsx` renders one `<ReactFlow>` canvas with two custom node types — `card` (`CardNode`) and `zone` (`ZoneNode`) — plus a `HeaderBar` overlay (theme toggle, category spotlight, workflow-view button) and a slide-in `DetailPanel` for the clicked card.

### Content lives in one file: `src/data/graph.ts`

Everything on the map — zones, cards, edges, categories — is declared there. Rendering is generic; to change the map you edit data, not components.

- **Zones** are non-interactive background territories (`zIndex: -10`, not selectable/draggable). **Cards** get an `enterOrder` stamped at declaration order, which staggers the entrance animation (45ms per card).
- **Edges** are declared via `edge(id, source, target, kind, label?, animated?)`; `kind` becomes `className: "edge-<kind>"`, which selects the stroke style in `index.css` and maps to a `Category` through `EDGE_CATEGORY` (used for spotlight dimming).
- **Edge handle sides are auto-computed** at module load: `routed()` compares node centers (using the fixed `CARD_W`/`CARD_H` = 236×118) and picks which of the four sides an edge leaves/enters (`sourceHandle: "s-l|r|t|b"`, `targetHandle: "t-..."`). `CardNode` renders all eight handles. So: just position nodes and edges route themselves — but if you change card dimensions in CSS, update `CARD_W`/`CARD_H` to match or routing degrades.

### Category system

The `Category` union (`pond0x | trix | infra | scout | strategy | risk`) threads through everything. Adding a category means touching all of: `CATEGORY_META` in `graph.ts` (legend label + CSS var name), `--c-<cat>` and `--halo-<cat>` in **both** `:root` and `.dark` blocks of `index.css`, and `EDGE_CATEGORY` if edges use it. The spotlight filter in `App.tsx` dims every node/edge whose category doesn't match the focused one. The workflow canvas reuses the same `--c-*` accents (`KIND_ACCENT`, `DATA_TYPE_VAR`).

Card icons are strings in the data, resolved through the `ICONS` record at the top of `CardNode.tsx` — a new icon name must be registered there (falls back to `Sparkles`).

## Workflow canvas (`src/features/workflow-canvas/`)

Self-contained feature module. **Import only from `index.ts`** (the declared public surface), never from internals.

### Two worlds, one store

`types.ts` deliberately splits state in two, composed by the zustand store (`store/`):

- **Execution slice** (persistent domain): `ExecutionNode` (discriminated on `kind: trigger | action | filter`) + `ExecutionEdge` — the DAG definition of what runs.
- **Canvas slice** (ephemeral view): per-node position/selection/drag/measured size, viewport. Never persisted, never in undo history.

`selectFlowNodes` / `selectFlowEdges` in `useWorkflowStore.ts` merge both into React Flow nodes/edges at read time, with hand-rolled reference-equality caches (zustand needs referentially stable selector output — keep that pattern if you touch them). React Flow change lists are routed by `onNodesChange`/`onEdgesChange`: geometry/selection → canvas slice, removals → execution slice.

### Undo/redo (zundo)

The temporal middleware is `partialize`d to the execution slice only, so pan/zoom/drag never pollute the undo stack (limit 100). Anything that mutates nodes/edges as a *runtime* effect rather than an authoring step must wrap itself in `temporal.pause()` / `resume()` — seeding (`data/seed.ts`) and simulation (`lib/simulate.ts`) both do. Keyboard bindings (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y) live in `useWorkflowHistory`.

### Handle schema is the single source of truth

`schema/handles.ts` (`HANDLE_SCHEMAS`) declares every port per node kind with its `PortDataType` (`event | record | boolean | any`) and `maxConnections`. Node components render handles from it and the connection validator checks against it, so the two cannot drift. `useConnectionValidator` enforces, in order: valid endpoints, output→input direction, data-type compatibility (`ACCEPTS` matrix), port capacity, no duplicate edge, no cycle (`lib/graph.ts` — the graph must stay a DAG). Rejections flash a reason via `onConnectEnd`.

Adding a node kind touches: `types.ts` (data type + union members), `HANDLE_SCHEMAS`, `schema/kinds.ts` (accent/label/icon), a component in `components/nodes/` + `nodeTypes.ts`.

### Layout, simulation, seed

- `useAutoLayout` runs dagre synchronously and commits all positions in ONE `setPositions` call; the move animates via a CSS transition gated by the `layoutAnimating` flag (normal drags stay instant). First layout happens in a `useLayoutEffect` before paint, so the canvas never flashes unpositioned nodes.
- `lib/simulate.ts` is a visual dry-run: walks the DAG in topological order flipping node `status` (`running` lights up outgoing gradient edges) — no real execution.
- `data/seed.ts` seeds a demo graph mirroring the pond-scout pipeline (TRiX launch → score gate → alert + watchlist), laid out with fallback sizes before first render.

Styles live in `workflow-canvas.css` (`wf-*` classes), reading the same theme tokens as the atlas.

## Theming

Pure CSS variables in `src/index.css`: `:root` is light ("lotus paper"), `.dark` is dark ("the pond at night"). `index.html` sets `class="dark"` as the default; the toggle just flips that class, and everything — Tailwind utilities, custom node styles, React Flow's `--xy-*` vars — reads the same tokens. Tailwind color/font utilities (`text-ink`, `text-muted`, `bg-surface`, `font-display`, …) are exposed via the `@theme inline` block. Custom node/edge styles (`.pmx-node`, `.pmx-zone`, `.edge-*`, dimming, atmosphere/grain overlay) also live in `index.css`. Fonts (Unbounded, Schibsted Grotesk, Fragment Mono) are loaded from Google Fonts in `index.html`.

## Keeping content truthful

Card blurbs quote concrete facts from the parent scanner — score weights, thresholds, alert names, loop intervals (e.g. "+15 score < 1h", "SCORE_PASS ≥ 65"). Those come from the root `src/scoring.ts` and `.env.example`; when scanner rules change, the corresponding card text here goes stale. The workflow canvas's trigger sources (`trix.launch`, `scout.score_pass`, …) and action types (`alert.webhook`, `watchlist.add`, `jupiter.*`) mirror real scanner concepts too. Same for ecosystem attribution (Pond0x = Hwonder & Pauly0x; TRiX/void.solutions = Jimmy Edgar) — it has been corrected before, keep it accurate.
