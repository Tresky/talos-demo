// ============================================
// ROOM DETECTION SYSTEM
// ============================================

import { CONFIG } from './config.js';
import { TILE } from './tiles.js';
import { isInBounds } from './map.js';

let nextRoomId = 0;

/**
 * Checks if a tile blocks room boundaries (is a wall).
 */
function isWall(state, x, y) {
    if (!isInBounds(x, y)) return false;
    return state.tiles[y][x] === TILE.WALL;
}

/**
 * Checks if a tile is walkable/interior space.
 */
function isInterior(state, x, y) {
    if (!isInBounds(x, y)) return false;
    const tile = state.tiles[y][x];
    // Floor, grass, stockpile, stump, rubble can be interior
    return tile !== TILE.WALL && tile !== TILE.TREE && tile !== TILE.ROCK;
}

/**
 * Flood fill from a starting point to find a contiguous area.
 * Returns { tiles: [{x,y}...], touchesEdge: boolean }
 */
function floodFill(state, startX, startY, visited) {
    const tiles = [];
    let touchesEdge = false;
    const stack = [{ x: startX, y: startY }];
    
    while (stack.length > 0) {
        const { x, y } = stack.pop();
        const key = `${x},${y}`;
        
        if (visited.has(key)) continue;
        if (!isInBounds(x, y)) {
            touchesEdge = true;
            continue;
        }
        if (isWall(state, x, y)) continue;
        if (!isInterior(state, x, y)) continue;
        
        visited.add(key);
        tiles.push({ x, y });
        
        // Check if on map edge
        if (x === 0 || x === CONFIG.mapWidth - 1 || 
            y === 0 || y === CONFIG.mapHeight - 1) {
            touchesEdge = true;
        }
        
        // Add neighbors (4-directional)
        stack.push({ x: x + 1, y });
        stack.push({ x: x - 1, y });
        stack.push({ x, y: y + 1 });
        stack.push({ x, y: y - 1 });
    }
    
    return { tiles, touchesEdge };
}

/**
 * Finds the bounding walls around a set of tiles.
 */
function findBoundingWalls(state, tiles) {
    const walls = new Set();
    
    for (const { x, y } of tiles) {
        // Check all 4 neighbors for walls
        const neighbors = [
            { x: x + 1, y },
            { x: x - 1, y },
            { x, y: y + 1 },
            { x, y: y - 1 },
        ];
        
        for (const n of neighbors) {
            if (isWall(state, n.x, n.y)) {
                walls.add(`${n.x},${n.y}`);
            }
        }
    }
    
    return Array.from(walls).map(key => {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
    });
}

/**
 * Calculates the bounding box of a set of tiles.
 */
function getBounds(tiles) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const { x, y } of tiles) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    }
    
    return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Detects all enclosed rooms in the map.
 * Called after walls are placed/removed.
 */
export function detectRooms(state) {
    const visited = new Set();
    const newRooms = [];
    
    // Scan entire map for enclosed spaces
    for (let y = 0; y < CONFIG.mapHeight; y++) {
        for (let x = 0; x < CONFIG.mapWidth; x++) {
            const key = `${x},${y}`;
            if (visited.has(key)) continue;
            if (isWall(state, x, y)) continue;
            if (!isInterior(state, x, y)) continue;
            
            // Flood fill from this tile
            const result = floodFill(state, x, y, visited);
            
            // If it doesn't touch the edge and has tiles, it's a room
            if (!result.touchesEdge && result.tiles.length > 0) {
                const bounds = getBounds(result.tiles);
                const walls = findBoundingWalls(state, result.tiles);
                
                newRooms.push({
                    id: nextRoomId++,
                    tiles: result.tiles,
                    walls: walls,
                    bounds: bounds,
                    size: result.tiles.length,
                    name: `Room ${nextRoomId}`,
                });
            }
        }
    }
    
    state.rooms = newRooms;
    
    // Clear selected room if it no longer exists
    if (state.ui.selectedRoom) {
        const stillExists = state.rooms.find(r => r.id === state.ui.selectedRoom.id);
        if (!stillExists) {
            state.ui.selectedRoom = null;
        }
    }
    
    return newRooms;
}

/**
 * Finds which room (if any) contains a given tile.
 */
export function getRoomAtTile(state, x, y) {
    for (const room of state.rooms) {
        for (const tile of room.tiles) {
            if (tile.x === x && tile.y === y) {
                return room;
            }
        }
    }
    return null;
}

/**
 * Gets room info for display.
 */
export function getRoomInfo(room) {
    if (!room) return null;
    
    return {
        name: room.name,
        size: room.size,
        dimensions: `${room.bounds.width}×${room.bounds.height}`,
        wallCount: room.walls.length,
    };
}
