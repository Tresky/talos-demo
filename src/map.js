// ============================================
// MAP GENERATION & MANIPULATION
// ============================================

import { CONFIG } from './config.js';
import { TILE } from './tiles.js';

/**
 * Generates the initial game map.
 * Populates state.tiles and state.stockpiles.
 */
export function generateMap(state) {
    state.tiles = [];
    state.stockpiles = [];
    
    const { mapWidth, mapHeight, treeChance, rockChance } = CONFIG;
    
    // Generate random terrain
    for (let y = 0; y < mapHeight; y++) {
        const row = [];
        for (let x = 0; x < mapWidth; x++) {
            const rand = Math.random();
            let tile = TILE.GRASS;
            
            if (rand < treeChance) {
                tile = TILE.TREE;
            } else if (rand < treeChance + rockChance) {
                tile = TILE.ROCK;
            }
            
            row.push(tile);
        }
        state.tiles.push(row);
    }
    
    // Clear starting area
    const cx = Math.floor(mapWidth / 2);
    const cy = Math.floor(mapHeight / 2);
    const radius = CONFIG.startingAreaRadius;
    
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const x = cx + dx;
            const y = cy + dy;
            if (isInBounds(x, y)) {
                state.tiles[y][x] = TILE.GRASS;
            }
        }
    }
    
    // Create initial stockpile in the center
    state.tiles[cy][cx] = TILE.STOCKPILE;
    state.stockpiles.push({ x: cx, y: cy });
}

/**
 * Checks if coordinates are within map bounds.
 */
export function isInBounds(x, y) {
    return x >= 0 && x < CONFIG.mapWidth && y >= 0 && y < CONFIG.mapHeight;
}

/**
 * Gets the center of the map in tile coordinates.
 */
export function getMapCenter() {
    return {
        x: Math.floor(CONFIG.mapWidth / 2),
        y: Math.floor(CONFIG.mapHeight / 2),
    };
}

/**
 * Converts tile coordinates to pixel coordinates (center of tile).
 */
export function tileToPixel(tileX, tileY) {
    return {
        x: tileX * CONFIG.tileSize + CONFIG.tileSize / 2,
        y: tileY * CONFIG.tileSize + CONFIG.tileSize / 2,
    };
}

/**
 * Converts pixel coordinates to tile coordinates.
 */
export function pixelToTile(pixelX, pixelY) {
    return {
        x: Math.floor(pixelX / CONFIG.tileSize),
        y: Math.floor(pixelY / CONFIG.tileSize),
    };
}

/**
 * Finds the nearest stockpile to a position.
 * Returns { x, y } or null if no stockpiles exist.
 */
export function findNearestStockpile(state, fromX, fromY) {
    let nearest = null;
    let nearestDist = Infinity;
    
    for (const sp of state.stockpiles) {
        const dist = Math.abs(sp.x - fromX) + Math.abs(sp.y - fromY);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = sp;
        }
    }
    
    return nearest;
}

/**
 * Adds a stockpile at the given position.
 */
export function addStockpile(state, x, y) {
    state.stockpiles.push({ x, y });
}
