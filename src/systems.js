// ============================================
// GAME SYSTEMS
// Movement, work completion, and update logic
// ============================================

import { CONFIG, BUILDINGS } from './config.js';
import { TILE, getDepletedTile } from './tiles.js';
import { setTile, addResource } from './state.js';
import { addStockpile } from './map.js';
import { clearTask, setCarrying, clearCarrying } from './colonist.js';
import { removeTask } from './tasks.js';

/**
 * Updates all colonists - movement and work.
 */
export function updateColonists(state) {
    for (const colonist of state.colonists) {
        if (!colonist.task) continue;
        
        updateColonistMovement(colonist);
        
        // If at destination, do work
        if (colonist.targetX !== null && 
            colonist.x === colonist.targetX && 
            colonist.y === colonist.targetY) {
            updateColonistWork(state, colonist);
        }
    }
}

/**
 * Moves a colonist towards their target.
 */
function updateColonistMovement(colonist) {
    if (colonist.targetX === null) return;
    
    const dx = colonist.targetX - colonist.x;
    const dy = colonist.targetY - colonist.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > CONFIG.colonistSpeed) {
        // Move towards target
        colonist.x += (dx / dist) * CONFIG.colonistSpeed;
        colonist.y += (dy / dist) * CONFIG.colonistSpeed;
    } else {
        // Snap to target
        colonist.x = colonist.targetX;
        colonist.y = colonist.targetY;
    }
}

/**
 * Processes work at the colonist's current location.
 */
function updateColonistWork(state, colonist) {
    const task = colonist.task;
    
    switch (task.type) {
        case 'gather':
            processGatherWork(state, colonist);
            break;
        case 'haul':
            processHaulWork(state, colonist);
            break;
        case 'build':
            processBuildWork(state, colonist);
            break;
    }
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
        default: return 0;
    }
}
