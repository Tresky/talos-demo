// ============================================
// GAME SYSTEMS
// Movement, work completion, and update logic
// ============================================

import { CONFIG, BUILDINGS, FURNITURE } from './config.js';
import { TILE, getDepletedTile } from './tiles.js';
import { getTile, setTile } from './state.js';
import { addStockpile, tileToPixel, pixelToTile } from './map.js';
import { clearTask, setCarrying, clearCarrying, setTarget, setPath, getColonistTile } from './colonist.js';
import { removeTask, addTask } from './tasks.js';
import { detectRooms } from './rooms.js';
import { isWalkable, findPath } from './pathfinding.js';
import { createItemStack, addItemStack, removeItemStack, findStockpileStackAt, findAvailableStockpile } from './items.js';

/**
 * Updates all colonists - movement and work.
 */
export function updateColonists(state) {
    for (const colonist of state.colonists) {
        // Handle wandering colonists (no task, just moving)
        if (colonist.wandering) {
            updateColonistMovement(state, colonist);
            if (isAtPathEnd(colonist)) {
                // Done wandering
                colonist.wandering = false;
                colonist.path = [];
                colonist.pathIndex = 0;
                colonist.targetX = null;
                colonist.targetY = null;
            }
            continue;
        }
        
        // Check for idle wandering
        if (!colonist.task && !colonist.carrying && !colonist.wandering) {
            maybeStartWandering(state, colonist);
            continue;
        }
        
        if (!colonist.task) continue;
        
        updateColonistMovement(state, colonist);
        
        // If at end of path, do work
        if (isAtPathEnd(colonist)) {
            updateColonistWork(state, colonist);
        }
    }
}

/**
 * Maybe start wandering if idle.
 */
function maybeStartWandering(state, colonist) {
    if (Math.random() > CONFIG.wanderChance) return;
    
    const currentTile = getColonistTile(colonist);
    const radius = CONFIG.wanderRadius;
    
    // Find a random walkable tile within radius
    const candidates = [];
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (dx === 0 && dy === 0) continue;
            const x = currentTile.x + dx;
            const y = currentTile.y + dy;
            if (isWalkable(state, x, y)) {
                candidates.push({ x, y });
            }
        }
    }
    
    if (candidates.length === 0) return;
    
    // Pick random destination
    const dest = candidates[Math.floor(Math.random() * candidates.length)];
    
    // Find path
    const path = findPath(state, currentTile.x, currentTile.y, dest.x, dest.y);
    if (!path || path.length < 2) return;
    
    // Start wandering
    colonist.wandering = true;
    setPath(colonist, path);
    const firstTarget = tileToPixel(path[0].x, path[0].y);
    setTarget(colonist, firstTarget.x, firstTarget.y);
}

/**
 * Checks if colonist has reached the end of their path.
 */
function isAtPathEnd(colonist) {
    if (!colonist.path || colonist.path.length === 0) return false;
    if (colonist.pathIndex < colonist.path.length - 1) return false;
    
    // At last waypoint - check if actually there
    return colonist.targetX !== null && 
           colonist.x === colonist.targetX && 
           colonist.y === colonist.targetY;
}

/**
 * Moves a colonist along their path.
 */
function updateColonistMovement(state, colonist) {
    if (colonist.targetX === null) return;
    
    // Check if target tile is still walkable before moving
    const targetTile = pixelToTile(colonist.targetX, colonist.targetY);
    if (!isWalkable(state, targetTile.x, targetTile.y)) {
        // Path is blocked - unassign task so it can be reassigned
        clearTask(colonist, true);
        return;
    }
    
    const dx = colonist.targetX - colonist.x;
    const dy = colonist.targetY - colonist.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > CONFIG.colonistSpeed) {
        // Check intermediate position won't cross into non-walkable tile
        const newX = colonist.x + (dx / dist) * CONFIG.colonistSpeed;
        const newY = colonist.y + (dy / dist) * CONFIG.colonistSpeed;
        const newTile = pixelToTile(newX, newY);
        const currentTile = pixelToTile(colonist.x, colonist.y);
        
        // Only move if staying in same tile or moving to walkable tile
        if ((newTile.x === currentTile.x && newTile.y === currentTile.y) || 
            isWalkable(state, newTile.x, newTile.y)) {
            colonist.x = newX;
            colonist.y = newY;
        } else {
            // Can't move - path blocked, unassign task
            clearTask(colonist, true);
            return;
        }
    } else {
        // Snap to target
        colonist.x = colonist.targetX;
        colonist.y = colonist.targetY;
        
        // Move to next waypoint if available
        if (colonist.path && colonist.pathIndex < colonist.path.length - 1) {
            colonist.pathIndex++;
            const nextWaypoint = colonist.path[colonist.pathIndex];
            
            // Check if next waypoint is walkable
            if (isWalkable(state, nextWaypoint.x, nextWaypoint.y)) {
                const target = tileToPixel(nextWaypoint.x, nextWaypoint.y);
                setTarget(colonist, target.x, target.y);
            } else {
                // Path blocked - unassign task
                clearTask(colonist, true);
            }
        }
    }
}

/**
 * Processes work at the colonist's current location.
 */
function updateColonistWork(state, colonist) {
    const task = colonist.task;
    
    switch (task.type) {
        case 'gather':
            // Verify colonist is adjacent to gather target
            if (isAdjacent(colonist, task.x, task.y)) {
                processGatherWork(state, colonist);
            }
            break;
        case 'pickup':
            // Pickup is at the stack location
            processPickupWork(state, colonist);
            break;
        case 'haul':
            processHaulWork(state, colonist);
            break;
        case 'build':
            // Verify colonist is adjacent to build target
            if (isAdjacent(colonist, task.x, task.y)) {
                processBuildWork(state, colonist);
            }
            break;
        case 'demolish':
            // Verify colonist is adjacent to demolish target
            if (isAdjacent(colonist, task.x, task.y)) {
                processDemolishWork(state, colonist);
            }
            break;
        case 'furniture':
            // Verify colonist is adjacent to furniture target
            if (isAdjacent(colonist, task.x, task.y)) {
                processFurnitureWork(state, colonist);
            }
            break;
    }
}

/**
 * Checks if colonist is adjacent to a tile (within 1 tile).
 */
function isAdjacent(colonist, tileX, tileY) {
    const colTileX = Math.floor(colonist.x / CONFIG.tileSize);
    const colTileY = Math.floor(colonist.y / CONFIG.tileSize);
    
    const dx = Math.abs(colTileX - tileX);
    const dy = Math.abs(colTileY - tileY);
    
    // Adjacent means exactly 1 tile away in cardinal direction
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

/**
 * Processes gathering work.
 */
function processGatherWork(state, colonist) {
    colonist.workProgress++;
    
    if (colonist.workProgress >= CONFIG.gatherTime) {
        completeGather(state, colonist);
    }
}

/**
 * Completes a gather task - drops resource on the ground.
 */
function completeGather(state, colonist) {
    const task = colonist.task;
    const tile = state.tiles[task.y][task.x];
    
    // Create item stack on the ground at the resource location
    const stack = createItemStack(task.resource, 1, 'ground', task.x, task.y);
    addItemStack(state, stack);
    
    // Deplete the tile
    const depletedTile = getDepletedTile(tile);
    setTile(state, task.x, task.y, depletedTile);
    
    // Remove task and reset colonist
    removeTask(state, task);
    clearTask(colonist);
}

/**
 * Processes pickup work - instant pickup.
 */
function processPickupWork(state, colonist) {
    completePickup(state, colonist);
}

/**
 * Completes a pickup task - colonist picks up the stack.
 */
function completePickup(state, colonist) {
    const task = colonist.task;
    
    // Find the stack
    const stack = state.itemStacks.find(s => s.id === task.stackId);
    if (stack) {
        // Pick up the stack
        setCarrying(colonist, stack.type, stack.amount);
        colonist.carryingStackId = stack.id;
        
        // Remove from ground
        removeItemStack(state, stack);
    }
    
    // Remove pickup task
    removeTask(state, task);
    clearTask(colonist);
}

/**
 * Processes hauling - deposit at stockpile.
 */
function processHaulWork(state, colonist) {
    completeHaul(state, colonist);
}

/**
 * Completes a haul task - deposits in stockpile.
 */
function completeHaul(state, colonist) {
    const task = colonist.task;
    
    // Deposit carried resources into the stockpile
    if (colonist.carrying) {
        // Check if this stockpile already has a stack
        const existingStack = findStockpileStackAt(state, task.x, task.y);
        
        if (existingStack) {
            // Add to existing stack (should be same type due to findAvailableStockpile)
            existingStack.amount += colonist.carrying.amount;
        } else {
            // Create new stack in stockpile
            const stack = createItemStack(
                colonist.carrying.type,
                colonist.carrying.amount,
                'stockpile',
                task.x,
                task.y
            );
            addItemStack(state, stack);
        }
        
        clearCarrying(colonist);
        colonist.carryingStackId = null;
    }
    
    clearTask(colonist);
}

/**
 * Checks if any colonist is standing on a tile.
 */
function isColonistOnTile(state, tileX, tileY) {
    for (const c of state.colonists) {
        const colTile = pixelToTile(c.x, c.y);
        if (colTile.x === tileX && colTile.y === tileY) {
            return true;
        }
    }
    return false;
}

/**
 * Processes building work.
 */
function processBuildWork(state, colonist) {
    const task = colonist.task;
    
    // On first frame of work, check if we can start and place foundation
    if (colonist.workProgress === 0) {
        // Check if any colonist is standing on the build site
        if (isColonistOnTile(state, task.x, task.y)) {
            // Can't build - someone is standing there
            // Unassign task so it can be retried later
            clearTask(colonist, true);
            return;
        }
        
        // Place foundation to block the tile
        // Store the original tile so we can restore if cancelled
        task.originalTile = state.tiles[task.y][task.x];
        setTile(state, task.x, task.y, TILE.FOUNDATION);
    }
    
    colonist.workProgress++;
    
    if (colonist.workProgress >= CONFIG.buildTime) {
        completeBuild(state, colonist);
    }
}

/**
 * Processes demolish work.
 */
function processDemolishWork(state, colonist) {
    const task = colonist.task;
    
    // On first frame of work, store original tile
    if (colonist.workProgress === 0) {
        task.originalTile = state.tiles[task.y][task.x];
    }
    
    colonist.workProgress++;
    
    if (colonist.workProgress >= CONFIG.demolishTime) {
        completeDemolish(state, colonist);
    }
}

/**
 * Completes a demolish task.
 */
function completeDemolish(state, colonist) {
    const task = colonist.task;
    
    // Remove the structure, replace with rubble
    setTile(state, task.x, task.y, TILE.RUBBLE);
    
    // Re-detect rooms since walls changed
    detectRooms(state);
    
    // If there's a follow-up task (e.g., build door), add it to queue
    if (task.followUpTask) {
        addTask(state, task.followUpTask);
    }
    
    // Remove task and reset colonist
    removeTask(state, task);
    clearTask(colonist);
}

/**
 * Completes a build task.
 */
function completeBuild(state, colonist) {
    const task = colonist.task;
    const building = BUILDINGS[task.buildType];
    
    if (building) {
        // Place the building tile
        const tileType = TILE[building.tile];
        setTile(state, task.x, task.y, tileType);
        
        // Special handling for stockpiles
        if (building.tile === 'STOCKPILE') {
            addStockpile(state, task.x, task.y);
        }
        
        // Detect rooms when walls or doors are placed
        if (building.tile === 'WALL' || building.tile === 'DOOR') {
            detectRooms(state);
        }
    }
    
    // Remove task and reset colonist
    removeTask(state, task);
    clearTask(colonist);
}

/**
 * Processes furniture building work.
 */
function processFurnitureWork(state, colonist) {
    const task = colonist.task;
    
    // On first frame of work, check if we can start and place foundation
    if (colonist.workProgress === 0) {
        // Check if any colonist is standing on the build site
        if (isColonistOnTile(state, task.x, task.y)) {
            clearTask(colonist, true);
            return;
        }
        
        // Place foundation
        task.originalTile = state.tiles[task.y][task.x];
        setTile(state, task.x, task.y, TILE.FOUNDATION);
    }
    
    colonist.workProgress++;
    
    if (colonist.workProgress >= CONFIG.buildTime) {
        completeFurniture(state, colonist);
    }
}

/**
 * Completes a furniture task.
 */
function completeFurniture(state, colonist) {
    const task = colonist.task;
    const furniture = FURNITURE[task.furnitureId];
    
    if (furniture) {
        // Place the furniture tile
        const tileType = TILE[furniture.tile];
        setTile(state, task.x, task.y, tileType);
        
        // Special handling for storage furniture (crates)
        if (furniture.isStorage) {
            addStockpile(state, task.x, task.y);
        }
    }
    
    // Remove task and reset colonist
    removeTask(state, task);
    clearTask(colonist);
}

/**
 * Gets the work time for a task type.
 */
export function getWorkTime(taskType) {
    switch (taskType) {
        case 'gather': return CONFIG.gatherTime;
        case 'build': return CONFIG.buildTime;
        case 'furniture': return CONFIG.buildTime;
        case 'demolish': return CONFIG.demolishTime;
        default: return 0;
    }
}
