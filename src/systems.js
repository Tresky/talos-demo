// ============================================
// GAME SYSTEMS
// Movement, work completion, and update logic
// ============================================

import { CONFIG, BUILDINGS } from './config.js';
import { TILE, getDepletedTile } from './tiles.js';
import { setTile, addResource } from './state.js';
import { addStockpile, tileToPixel, pixelToTile } from './map.js';
import { clearTask, setCarrying, clearCarrying, setTarget } from './colonist.js';
import { removeTask, addTask } from './tasks.js';
import { detectRooms } from './rooms.js';
import { isWalkable } from './pathfinding.js';

/**
 * Updates all colonists - movement and work.
 */
export function updateColonists(state) {
    for (const colonist of state.colonists) {
        if (!colonist.task) continue;
        
        updateColonistMovement(state, colonist);
        
        // If at end of path, do work
        if (isAtPathEnd(colonist)) {
            updateColonistWork(state, colonist);
        }
    }
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
 * Completes a gather task.
 */
function completeGather(state, colonist) {
    const task = colonist.task;
    const tile = state.tiles[task.y][task.x];
    
    // Pick up resource
    setCarrying(colonist, task.resource, 1);
    
    // Deplete the tile
    const depletedTile = getDepletedTile(tile);
    setTile(state, task.x, task.y, depletedTile);
    
    // Remove task and reset colonist
    removeTask(state, task);
    clearTask(colonist);
}

/**
 * Processes hauling - instant deposit.
 */
function processHaulWork(state, colonist) {
    completeHaul(state, colonist);
}

/**
 * Completes a haul task.
 */
function completeHaul(state, colonist) {
    // Deposit carried resources
    if (colonist.carrying) {
        addResource(state, colonist.carrying.type, colonist.carrying.amount);
        clearCarrying(colonist);
    }
    
    clearTask(colonist);
}

/**
 * Processes building work.
 */
function processBuildWork(state, colonist) {
    colonist.workProgress++;
    
    if (colonist.workProgress >= CONFIG.buildTime) {
        completeBuild(state, colonist);
    }
}

/**
 * Processes demolish work.
 */
function processDemolishWork(state, colonist) {
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
 * Gets the work time for a task type.
 */
export function getWorkTime(taskType) {
    switch (taskType) {
        case 'gather': return CONFIG.gatherTime;
        case 'build': return CONFIG.buildTime;
        case 'demolish': return CONFIG.demolishTime;
        default: return 0;
    }
}
