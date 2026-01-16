// ============================================
// TASK SYSTEM
// ============================================

import { CONFIG, BUILDINGS } from './config.js';
import { TILE, isGatherable, isBuildable, getResourceType } from './tiles.js';
import { getTile, canAfford, payCost } from './state.js';
import { isInBounds, tileToPixel, pixelToTile, findNearestStockpile } from './map.js';
import { isIdle, isCarrying, setTarget, setPath, getColonistTile } from './colonist.js';
import { findPath, findWorkPosition } from './pathfinding.js';

let nextTaskId = 0;

/**
 * Creates a gather task for a resource tile.
 * Returns null if invalid position or not gatherable.
 */
export function createGatherTask(state, tileX, tileY) {
    if (!isInBounds(tileX, tileY)) return null;
    
    const tile = getTile(state, tileX, tileY);
    if (!isGatherable(tile)) return null;
    
    // Check if task already exists for this tile
    const exists = state.tasks.some(t => 
        t.type === 'gather' && t.x === tileX && t.y === tileY
    );
    if (exists) return null;
    
    return {
        id: nextTaskId++,
        type: 'gather',
        x: tileX,
        y: tileY,
        resource: getResourceType(tile),
        assigned: null,
    };
}

/**
 * Creates a build task.
 * Returns null if invalid position, can't build there, or can't afford.
 */
export function createBuildTask(state, tileX, tileY, buildType) {
    if (!isInBounds(tileX, tileY)) return null;
    
    const tile = getTile(state, tileX, tileY);
    if (!isBuildable(tile)) return null;
    
    const building = BUILDINGS[buildType];
    if (!building) return null;
    
    // Check and deduct cost
    if (!payCost(state, building.cost)) return null;
    
    return {
        id: nextTaskId++,
        type: 'build',
        x: tileX,
        y: tileY,
        buildType,
        assigned: null,
    };
}

/**
 * Creates a haul task for a colonist carrying resources.
 */
export function createHaulTask(state, colonist) {
    const colonistTile = pixelToTile(colonist.x, colonist.y);
    const stockpile = findNearestStockpile(state, colonistTile.x, colonistTile.y);
    
    if (!stockpile) return null;
    
    return {
        id: nextTaskId++,
        type: 'haul',
        x: stockpile.x,
        y: stockpile.y,
        assigned: colonist.id,
    };
}

/**
 * Assigns pending tasks to idle colonists.
 */
export function assignTasks(state) {
    for (const colonist of state.colonists) {
        if (!isIdle(colonist)) continue;
        
        const colonistTile = getColonistTile(colonist);
        
        // If carrying something, create and assign haul task
        if (isCarrying(colonist)) {
            const haulTask = createHaulTask(state, colonist);
            if (haulTask) {
                // Find path to stockpile (can walk onto stockpile)
                const path = findPath(state, colonistTile.x, colonistTile.y, haulTask.x, haulTask.y);
                if (path && path.length > 0) {
                    colonist.task = haulTask;
                    setPath(colonist, path);
                    // Set first waypoint
                    const firstTarget = tileToPixel(path[0].x, path[0].y);
                    setTarget(colonist, firstTarget.x, firstTarget.y);
                }
            }
            continue;
        }
        
        // Find first unassigned task with valid path
        for (const task of state.tasks) {
            if (task.assigned === null) {
                // Find work position (adjacent to task target)
                const workPos = findWorkPosition(state, task.x, task.y, colonistTile.x, colonistTile.y);
                if (!workPos) continue;  // No accessible work position
                
                // Find path to work position
                const path = findPath(state, colonistTile.x, colonistTile.y, workPos.x, workPos.y);
                if (!path || path.length === 0) continue;  // No path
                
                // Assign task
                task.assigned = colonist.id;
                colonist.task = task;
                setPath(colonist, path);
                
                // Set first waypoint
                const firstTarget = tileToPixel(path[0].x, path[0].y);
                setTarget(colonist, firstTarget.x, firstTarget.y);
                break;
            }
        }
    }
}

/**
 * Removes a task from the queue.
 */
export function removeTask(state, task) {
    const idx = state.tasks.indexOf(task);
    if (idx >= 0) {
        state.tasks.splice(idx, 1);
    }
}

/**
 * Adds a task to the queue.
 */
export function addTask(state, task) {
    if (task) {
        state.tasks.push(task);
    }
}

/**
 * Checks if a build can be afforded.
 */
export function canAffordBuild(state, buildType) {
    const building = BUILDINGS[buildType];
    return building ? canAfford(state, building.cost) : false;
}
