// ============================================
// TASK SYSTEM
// ============================================

import { CONFIG, BUILDINGS } from './config.js';
import { TILE, isGatherable, isBuildable, getResourceType, isDemolishable } from './tiles.js';
import { getTile, canAfford, payCost } from './state.js';
import { isInBounds, tileToPixel, pixelToTile } from './map.js';
import { isIdle, isCarrying, setTarget, setPath, getColonistTile } from './colonist.js';
import { findPath, findWorkPosition } from './pathfinding.js';
import { findAvailableStockpile, getGroundStacks } from './items.js';

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
 * Creates a demolish task.
 * Returns null if invalid position or not demolishable.
 */
export function createDemolishTask(state, tileX, tileY) {
    if (!isInBounds(tileX, tileY)) return null;
    
    const tile = getTile(state, tileX, tileY);
    if (!isDemolishable(tile)) return null;
    
    // Check if task already exists for this tile
    const exists = state.tasks.some(t => 
        t.type === 'demolish' && t.x === tileX && t.y === tileY
    );
    if (exists) return null;
    
    return {
        id: nextTaskId++,
        type: 'demolish',
        x: tileX,
        y: tileY,
        assigned: null,
    };
}

/**
 * Creates a build task.
 * Returns null if invalid position, can't build there, or can't afford.
 * If placing a door over a wall, returns an array of [demolishTask, buildTask].
 */
export function createBuildTask(state, tileX, tileY, buildType) {
    if (!isInBounds(tileX, tileY)) return null;
    
    const tile = getTile(state, tileX, tileY);
    const building = BUILDINGS[buildType];
    if (!building) return null;
    
    // Special case: placing door over wall
    if (buildType === 'door' && tile === TILE.WALL) {
        // Check and deduct cost
        if (!payCost(state, building.cost)) return null;
        
        // Create demolish task first
        const demolishTask = {
            id: nextTaskId++,
            type: 'demolish',
            x: tileX,
            y: tileY,
            assigned: null,
        };
        
        // Create pending build task (will be added after demolish completes)
        const buildTask = {
            id: nextTaskId++,
            type: 'build',
            x: tileX,
            y: tileY,
            buildType,
            assigned: null,
            pendingAfterDemolish: true,  // Flag to not add to queue yet
        };
        
        // Store the follow-up build task on the demolish task
        demolishTask.followUpTask = buildTask;
        
        return demolishTask;
    }
    
    // Normal build - tile must be buildable
    if (!isBuildable(tile)) return null;
    
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
 * Creates a pickup task for a ground item stack.
 */
export function createPickupTask(state, stack) {
    // Check if task already exists for this stack
    const exists = state.tasks.some(t => 
        t.type === 'pickup' && t.stackId === stack.id
    );
    if (exists) return null;
    
    return {
        id: nextTaskId++,
        type: 'pickup',
        x: stack.x,
        y: stack.y,
        stackId: stack.id,
        resource: stack.type,
        assigned: null,
    };
}

/**
 * Creates a haul task for a colonist carrying resources.
 * Finds a compatible stockpile (same type or empty).
 */
export function createHaulTask(state, colonist) {
    if (!colonist.carrying) return null;
    
    const colonistTile = pixelToTile(colonist.x, colonist.y);
    const stockpile = findAvailableStockpile(
        state, 
        colonist.carrying.type, 
        colonistTile.x, 
        colonistTile.y
    );
    
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
    // First, create pickup tasks for unhauled ground stacks
    for (const stack of getGroundStacks(state)) {
        // Check if there's already a pickup task for this stack
        const hasPickupTask = state.tasks.some(t => 
            t.type === 'pickup' && t.stackId === stack.id
        );
        if (!hasPickupTask) {
            // Check if there's an available stockpile for this type
            const stockpile = findAvailableStockpile(state, stack.type, stack.x, stack.y);
            if (stockpile) {
                const pickupTask = createPickupTask(state, stack);
                if (pickupTask) {
                    state.tasks.push(pickupTask);
                }
            }
        }
    }
    
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
                let targetX = task.x;
                let targetY = task.y;
                let needsAdjacent = true;
                
                // Pickup tasks go directly to the stack location
                if (task.type === 'pickup') {
                    needsAdjacent = false;
                }
                
                if (needsAdjacent) {
                    // Find work position (adjacent to task target)
                    const workPos = findWorkPosition(state, task.x, task.y, colonistTile.x, colonistTile.y);
                    if (!workPos) continue;  // No accessible work position
                    targetX = workPos.x;
                    targetY = workPos.y;
                }
                
                // Find path to work position
                const path = findPath(state, colonistTile.x, colonistTile.y, targetX, targetY);
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
