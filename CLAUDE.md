# CLAUDE.md - Talos Demo

This is the development documentation for the Talos Demo project - a minimal colony simulation demonstrating the core **Gather → Store → Build** loop.

## Project Overview

**What:** 2D browser-based colony sim prototype  
**Purpose:** Prove out the fundamental gameplay loop before building the full Talos game  
**Stack:** Vanilla JavaScript (ES Modules), HTML5 Canvas, CSS  
**Deployment:** Vercel (auto-deploys from main branch)

### The Core Loop

```
GATHER → STORE → BUILD → (repeat)

1. Player clicks resource (tree/rock)
2. Colonist walks to resource, gathers it
3. Colonist hauls resource to stockpile
4. Resources accumulate in stockpile
5. Player spends resources to place buildings
6. Colonist walks to build site, constructs building
```

---

## Project Structure

```
talos-demo/
├── index.html          # Entry HTML, loads modules
├── styles.css          # All CSS styles
├── CLAUDE.md           # This file - project documentation
├── game.js             # DEPRECATED - old monolithic file (keep for reference)
│
└── src/                # Modular source code
    ├── main.js         # Entry point, game loop, bootstrapping
    ├── config.js       # All configuration constants
    ├── state.js        # Game state object and helpers
    ├── tiles.js        # Tile types, metadata, helpers
    ├── map.js          # Map generation and spatial utilities
    ├── colonist.js     # Colonist entity and helpers
    ├── tasks.js        # Task creation and assignment
    ├── systems.js      # Movement, work completion logic
    ├── renderer.js     # Canvas rendering
    ├── ui.js           # DOM/sidebar updates
    └── input.js        # Mouse and keyboard handling
```

---

## Module Responsibilities

### `config.js`
All magic numbers and game constants. Change values here to tune gameplay.
- Map dimensions, tile size
- Colonist speed, work timings
- Building definitions and costs
- Map generation parameters

### `state.js`
The single source of truth. All game data lives in the state object.
- `createState()` - factory for fresh state
- Resource helpers: `addResource()`, `removeResource()`, `canAfford()`, `payCost()`
- Tile access: `getTile()`, `setTile()`

### `tiles.js`
Tile type enum and metadata system. Extensible for new tile types.
- `TILE` enum (GRASS, TREE, ROCK, WALL, etc.)
- `TILE_DATA` - metadata per tile (walkable, buildable, gatherable, etc.)
- Helpers: `isGatherable()`, `isBuildable()`, `getResourceType()`, `getDepletedTile()`

### `map.js`
World generation and spatial utilities.
- `generateMap()` - creates random terrain, clears starting area
- `isInBounds()` - bounds checking
- `tileToPixel()` / `pixelToTile()` - coordinate conversion
- `findNearestStockpile()` - pathfinding helper

### `colonist.js`
Colonist entity management.
- `createColonist()` - factory function
- `spawnStartingColonists()` - initial population
- State helpers: `isIdle()`, `isCarrying()`, `setTarget()`, `clearTask()`
- `getStatusText()` - UI status string

### `tasks.js`
Task queue management.
- `createGatherTask()` / `createBuildTask()` / `createHaulTask()` - factories
- `assignTasks()` - matches idle colonists to pending tasks
- `addTask()` / `removeTask()` - queue manipulation

### `systems.js`
Core game logic that runs each frame.
- `updateColonists()` - movement and work processing
- Work completion: `completeGather()`, `completeHaul()`, `completeBuild()`

### `renderer.js`
All canvas drawing code.
- `render(state, ctx)` - main render function
- Layer functions: tiles, task indicators, colonists, build preview
- Individual tile renderers: `renderTree()`, `renderRock()`, etc.

### `ui.js`
DOM manipulation for the sidebar.
- `initUI()` - caches DOM elements
- `updateUI()` - refreshes all UI elements
- `setupBuildButtons()` - click handlers for build mode

### `input.js`
Event handling.
- `setupInput()` - attaches all listeners
- Click handling for gather/build
- Hover tracking for build preview
- Keyboard (Escape to cancel)

---

## Data Flow

```
Input Events
    │
    ▼
Create Tasks (tasks.js)
    │
    ▼
Task Queue (state.tasks)
    │
    ▼
Assign Tasks (tasks.js) ◄──── Game Loop
    │
    ▼
Update Colonists (systems.js)
    │
    ├─► Movement
    │
    └─► Work Completion
            │
            ▼
        State Changes
            │
            ├─► Tile changes (state.tiles)
            ├─► Resource changes (state.resources)
            └─► Stockpile changes (state.stockpiles)
                    │
                    ▼
                Render (renderer.js)
                    │
                    ▼
                Update UI (ui.js)
```

---

## Key Patterns

### State is Passed, Not Global
Functions receive `state` as a parameter rather than accessing globals. This makes testing easier and data flow explicit.

### Tile Metadata System
Instead of switch statements everywhere, `TILE_DATA` stores properties per tile type. To add a new tile:
1. Add to `TILE` enum
2. Add entry to `TILE_DATA` with properties
3. Add renderer in `renderer.js` if needed

### Task System
Tasks are data objects in a queue. Colonists claim tasks, execute them, then the task is removed. This decouples "what needs doing" from "who does it."

### Coordinate Systems
- **Tile coordinates**: Integer grid positions (0-29 for x, 0-21 for y)
- **Pixel coordinates**: Canvas positions (tile * 32 + 16 for center)
- Use `tileToPixel()` and `pixelToTile()` for conversion

---

## Adding New Features

### New Resource Type
1. Add to `state.resources` in `state.js`
2. Add gatherable tile in `tiles.js` with `resource` property
3. Update UI in `index.html` and `ui.js`

### New Building Type
1. Add to `BUILDINGS` in `config.js`
2. Add tile type in `tiles.js`
3. Add renderer in `renderer.js`
4. Add button in `index.html`
5. Update `ui.js` to handle new button

### New Colonist Behavior
1. Add task type creation in `tasks.js`
2. Add processing in `systems.js`
3. Update `getStatusText()` in `colonist.js`

---

## Implementation Notes

### Click Coordinate Handling
Uses `e.offsetX/offsetY` (not clientX/clientY) to handle canvas border correctly. Scales by `canvas.width / canvas.offsetWidth` for CSS size differences.

### Canvas Border
The canvas has a 2px border. DOM coordinates account for this automatically with offsetX/offsetY.

### Frame Rate
Uses `requestAnimationFrame` (~60fps). All timings in config are frame counts, not milliseconds.

---

## TODO / Future Work

- [ ] Pathfinding (currently colonists walk through obstacles)
- [ ] Multiple resource yields per gather
- [ ] Resource regrowth
- [ ] Colonist needs (hunger, rest)
- [ ] Save/load
- [ ] Sound effects
- [ ] Mobile touch support

---

## Commands

```bash
# Local development
cd ~/repos/github.com/Tresky/talos-demo
python3 -m http.server 8080
# Open http://localhost:8080

# Deploy
vercel --prod --yes --token "$VERCEL_TOKEN"

# Or just push to main - Vercel auto-deploys
git add . && git commit -m "message" && git push
```

---

## Updating This Document

When making significant changes:
1. Update the relevant section above
2. Add implementation notes for non-obvious decisions
3. Update TODO list as features are completed or added
4. Keep the module responsibilities section current

**Last updated:** 2026-01-16
