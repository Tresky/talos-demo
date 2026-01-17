// ============================================
// GAME STATE
// ============================================

import { getTotalStockpileResources } from './items.js';

/**
 * Creates a fresh game state object.
 * State is the single source of truth for the game.
 */
export function createState() {
    return {
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
        
        // Item stacks (on ground or in stockpiles)
        itemStacks: [],
        
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
 * Gets total resources available in stockpiles.
 * This replaces the old global resource tracking.
 */
export function getResources(state) {
    return {
        wood: getTotalStockpileResources(state, 'wood'),
        stone: getTotalStockpileResources(state, 'stone'),
    };
}

/**
 * Checks if we can afford a cost object { resource: amount, ... }
 */
export function canAfford(state, cost) {
    const resources = getResources(state);
    for (const [resource, amount] of Object.entries(cost)) {
        if ((resources[resource] || 0) < amount) {
            return false;
        }
    }
    return true;
}

/**
 * Deducts a cost object from stockpile resources.
 * Removes items from stockpiles starting with the first ones found.
 * Returns true if successful.
 */
export function payCost(state, cost) {
    if (!canAfford(state, cost)) return false;
    
    for (const [resourceType, amountNeeded] of Object.entries(cost)) {
        let remaining = amountNeeded;
        
        // Find stockpile stacks of this type and deduct
        for (const stack of state.itemStacks) {
            if (stack.location !== 'stockpile' || stack.type !== resourceType) continue;
            if (remaining <= 0) break;
            
            if (stack.amount <= remaining) {
                // Take the whole stack
                remaining -= stack.amount;
                stack.amount = 0;
            } else {
                // Take partial
                stack.amount -= remaining;
                remaining = 0;
            }
        }
        
        // Clean up empty stacks
        state.itemStacks = state.itemStacks.filter(s => s.amount > 0);
    }
    
    return true;
}
