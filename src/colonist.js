// ============================================
// COLONIST SYSTEM
// ============================================

import { CONFIG } from './config.js';
import { getMapCenter, tileToPixel, pixelToTile } from './map.js';

let nextColonistId = 0;

/**
 * Creates a new colonist entity.
 */
export function createColonist(name, pixelX, pixelY) {
    return {
        id: nextColonistId++,
        name,
        x: pixelX,
        y: pixelY,
        task: null,
        carrying: null,  // { type: 'wood'|'stone', amount: number } or null
        workProgress: 0,
        path: [],        // Array of {x, y} tile positions to follow
        pathIndex: 0,    // Current position in path
        targetX: null,   // Current movement target (pixel coords)
        targetY: null,
    };
}

/**
 * Spawns the starting colonists near map center.
 */
export function spawnStartingColonists(state) {
    const center = getMapCenter();
    const count = CONFIG.startingColonists;
    const names = CONFIG.colonistNames;
    
    for (let i = 0; i < count; i++) {
        // Spread colonists horizontally below center
        const tileX = center.x + (i - Math.floor(count / 2));
        const tileY = center.y + 1;
        const { x, y } = tileToPixel(tileX, tileY);
        
        const colonist = createColonist(names[i % names.length], x, y);
        state.colonists.push(colonist);
    }
}

/**
 * Gets the tile position of a colonist.
 */
export function getColonistTile(colonist) {
    return pixelToTile(colonist.x, colonist.y);
}

/**
 * Sets the colonist's movement target (in pixels).
 */
export function setTarget(colonist, pixelX, pixelY) {
    colonist.targetX = pixelX;
    colonist.targetY = pixelY;
}

/**
 * Sets the colonist's path to follow.
 */
export function setPath(colonist, path) {
    colonist.path = path || [];
    colonist.pathIndex = 0;
}

/**
 * Clears colonist's current task and resets work state.
 * If unassign is true, also unassigns the task so it can be picked up again.
 */
export function clearTask(colonist, unassign = false) {
    if (unassign && colonist.task) {
        colonist.task.assigned = null;
    }
    colonist.task = null;
    colonist.workProgress = 0;
    colonist.path = [];
    colonist.pathIndex = 0;
    colonist.targetX = null;
    colonist.targetY = null;
}

/**
 * Checks if colonist is idle (no task).
 */
export function isIdle(colonist) {
    return colonist.task === null;
}

/**
 * Checks if colonist is carrying something.
 */
export function isCarrying(colonist) {
    return colonist.carrying !== null;
}

/**
 * Sets what the colonist is carrying.
 */
export function setCarrying(colonist, type, amount) {
    colonist.carrying = { type, amount };
}

/**
 * Clears what the colonist is carrying.
 */
export function clearCarrying(colonist) {
    colonist.carrying = null;
}

/**
 * Gets colonist status string for UI.
 */
export function getStatusText(colonist) {
    if (colonist.carrying) {
        return `Hauling ${colonist.carrying.type}`;
    }
    if (colonist.task) {
        switch (colonist.task.type) {
            case 'gather':
                return `Gathering ${colonist.task.resource}`;
            case 'build':
                return `Building ${colonist.task.buildType}`;
            case 'demolish':
                return 'Demolishing';
            case 'haul':
                return 'Hauling';
            default:
                return 'Working';
        }
    }
    return 'Idle';
}
