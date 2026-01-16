// ============================================
// GAME STATE
// ============================================

/**
 * Creates a fresh game state object.
 * State is the single source of truth for the game.
 */
export function createState() {
    return {
        // Resources in stockpile
        resources: {
            wood: 1000,
            stone: 1000,
        },
        
        // Current build mode (null when not building)
        buildMode: null,
        
        // 2D array of tile types [y][x]
        tiles: [],
        
        // Array of colonist objects
        colonists: [],
        
        // Task queue (gather, build tasks)
        tasks: [],
        
        // Stockpile locations
        stockpiles: [],
        
        // Detected rooms (enclosed spaces)
        rooms: [],
        
        // UI state
        ui: {
            hoverTile: null,  // { x, y } or null
            selectedRoom: null,  // room object or null
        },
    };
}

/**
 * Gets a tile at position, with bounds checking.
 * Returns null if out of bounds.
 */
export function getTile(state, x, y) {
    if (y < 0 || y >= state.tiles.length) return null;
    if (x < 0 || x >= state.tiles[0].length) return null;
    return state.tiles[y][x];
}

/**
 * Sets a tile at position, with bounds checking.
 * Returns true if successful.
 */
export function setTile(state, x, y, tileType) {
    if (y < 0 || y >= state.tiles.length) return false;
    if (x < 0 || x >= state.tiles[0].length) return false;
    state.tiles[y][x] = tileType;
    return true;
}

/**
 * Adds resources to the stockpile.
 */
export function addResource(state, type, amount) {
    if (state.resources[type] !== undefined) {
        state.resources[type] += amount;
    }
}

/**
 * Removes resources from the stockpile.
 * Returns true if successful (had enough resources).
 */
export function removeResource(state, type, amount) {
    if (state.resources[type] !== undefined && state.resources[type] >= amount) {
        state.resources[type] -= amount;
        return true;
    }
    return false;
}

/**
 * Checks if we can afford a cost object { resource: amount, ... }
 */
export function canAfford(state, cost) {
    for (const [resource, amount] of Object.entries(cost)) {
        if ((state.resources[resource] || 0) < amount) {
            return false;
        }
    }
    return true;
}

/**
 * Deducts a cost object from resources.
 * Returns true if successful.
 */
export function payCost(state, cost) {
    if (!canAfford(state, cost)) return false;
    for (const [resource, amount] of Object.entries(cost)) {
        state.resources[resource] -= amount;
    }
    return true;
}
