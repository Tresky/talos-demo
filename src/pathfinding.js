// ============================================
// PATHFINDING (A* Algorithm)
// ============================================

import { CONFIG } from './config.js';
import { TILE, TILE_DATA } from './tiles.js';
import { isInBounds } from './map.js';

/**
 * Checks if a tile is walkable.
 */
export function isWalkable(state, x, y) {
    if (!isInBounds(x, y)) return false;
    const tile = state.tiles[y][x];
    const data = TILE_DATA[tile];
    return data?.walkable === true;
}

/**
 * Gets walkable neighbors of a tile (4-directional).
 */
function getNeighbors(state, x, y) {
    const neighbors = [];
    const directions = [
        { x: 0, y: -1 },  // up
        { x: 0, y: 1 },   // down
        { x: -1, y: 0 },  // left
        { x: 1, y: 0 },   // right
    ];
    
    for (const dir of directions) {
        const nx = x + dir.x;
        const ny = y + dir.y;
        if (isWalkable(state, nx, ny)) {
            neighbors.push({ x: nx, y: ny });
        }
    }
    
    return neighbors;
}

/**
 * Manhattan distance heuristic.
 */
function heuristic(ax, ay, bx, by) {
    return Math.abs(ax - bx) + Math.abs(ay - by);
}

/**
 * Finds a path from start to goal using A*.
 * Returns array of {x, y} positions, or null if no path exists.
 * Path includes start and goal positions.
 */
export function findPath(state, startX, startY, goalX, goalY) {
    // If goal is not walkable, find adjacent walkable tile
    if (!isWalkable(state, goalX, goalY)) {
        const adjacent = getWalkableAdjacent(state, goalX, goalY);
        if (adjacent.length === 0) return null;
        // Pick closest adjacent tile to start
        let best = adjacent[0];
        let bestDist = heuristic(startX, startY, best.x, best.y);
        for (const adj of adjacent) {
            const dist = heuristic(startX, startY, adj.x, adj.y);
            if (dist < bestDist) {
                bestDist = dist;
                best = adj;
            }
        }
        goalX = best.x;
        goalY = best.y;
    }
    
    // If start equals goal, return single point
    if (startX === goalX && startY === goalY) {
        return [{ x: startX, y: startY }];
    }
    
    const openSet = new Map();  // key -> { x, y, g, f, parent }
    const closedSet = new Set();
    
    const startKey = `${startX},${startY}`;
    const startNode = {
        x: startX,
        y: startY,
        g: 0,
        f: heuristic(startX, startY, goalX, goalY),
        parent: null,
    };
    openSet.set(startKey, startNode);
    
    while (openSet.size > 0) {
        // Find node with lowest f score
        let current = null;
        let currentKey = null;
        for (const [key, node] of openSet) {
            if (!current || node.f < current.f) {
                current = node;
                currentKey = key;
            }
        }
        
        // Reached goal?
        if (current.x === goalX && current.y === goalY) {
            // Reconstruct path
            const path = [];
            let node = current;
            while (node) {
                path.unshift({ x: node.x, y: node.y });
                node = node.parent;
            }
            return path;
        }
        
        // Move current to closed set
        openSet.delete(currentKey);
        closedSet.add(currentKey);
        
        // Check neighbors
        const neighbors = getNeighbors(state, current.x, current.y);
        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            
            if (closedSet.has(neighborKey)) continue;
            
            const g = current.g + 1;
            const existing = openSet.get(neighborKey);
            
            if (!existing || g < existing.g) {
                const node = {
                    x: neighbor.x,
                    y: neighbor.y,
                    g: g,
                    f: g + heuristic(neighbor.x, neighbor.y, goalX, goalY),
                    parent: current,
                };
                openSet.set(neighborKey, node);
            }
        }
    }
    
    // No path found
    return null;
}

/**
 * Gets walkable tiles adjacent to a position.
 */
export function getWalkableAdjacent(state, x, y) {
    const adjacent = [];
    const directions = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
    ];
    
    for (const dir of directions) {
        const nx = x + dir.x;
        const ny = y + dir.y;
        if (isWalkable(state, nx, ny)) {
            adjacent.push({ x: nx, y: ny });
        }
    }
    
    return adjacent;
}

/**
 * Finds the best adjacent tile to work from.
 * Returns {x, y} or null if no walkable adjacent tile.
 */
export function findWorkPosition(state, targetX, targetY, workerX, workerY) {
    const adjacent = getWalkableAdjacent(state, targetX, targetY);
    
    if (adjacent.length === 0) return null;
    
    // If worker is already adjacent, stay there
    for (const adj of adjacent) {
        if (adj.x === workerX && adj.y === workerY) {
            return adj;
        }
    }
    
    // Find the adjacent tile closest to worker (shortest path)
    let best = null;
    let bestDist = Infinity;
    
    for (const adj of adjacent) {
        const dist = heuristic(workerX, workerY, adj.x, adj.y);
        if (dist < bestDist) {
            bestDist = dist;
            best = adj;
        }
    }
    
    return best;
}
