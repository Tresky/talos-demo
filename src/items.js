// ============================================
// ITEM STACK SYSTEM
// ============================================

let nextStackId = 0;

/**
 * Creates a new item stack.
 * @param {string} type - 'wood' or 'stone'
 * @param {number} amount - quantity in stack
 * @param {string} location - 'ground' or 'stockpile'
 * @param {number} x - tile x coordinate
 * @param {number} y - tile y coordinate
 */
export function createItemStack(type, amount, location, x, y) {
    return {
        id: nextStackId++,
        type,
        amount,
        location,  // 'ground' or 'stockpile'
        x,
        y,
    };
}

/**
 * Adds an item stack to the game state.
 */
export function addItemStack(state, stack) {
    state.itemStacks.push(stack);
    return stack;
}

/**
 * Removes an item stack from the game state.
 */
export function removeItemStack(state, stack) {
    const idx = state.itemStacks.indexOf(stack);
    if (idx >= 0) {
        state.itemStacks.splice(idx, 1);
    }
}

/**
 * Finds an item stack on the ground at a position.
 */
export function findGroundStackAt(state, x, y) {
    return state.itemStacks.find(s => 
        s.location === 'ground' && s.x === x && s.y === y
    );
}

/**
 * Finds an item stack in a stockpile at a position.
 */
export function findStockpileStackAt(state, x, y) {
    return state.itemStacks.find(s => 
        s.location === 'stockpile' && s.x === x && s.y === y
    );
}

/**
 * Gets all item stacks on the ground.
 */
export function getGroundStacks(state) {
    return state.itemStacks.filter(s => s.location === 'ground');
}

/**
 * Gets all item stacks in stockpiles.
 */
export function getStockpileStacks(state) {
    return state.itemStacks.filter(s => s.location === 'stockpile');
}

/**
 * Finds a stockpile that can accept a resource type.
 * Prefers stockpiles that already have that type, then empty ones.
 * @param {object} state - game state
 * @param {string} resourceType - 'wood' or 'stone'
 * @param {number} fromX - colonist x position for distance calc
 * @param {number} fromY - colonist y position for distance calc
 * @returns {{ x, y } | null}
 */
export function findAvailableStockpile(state, resourceType, fromX, fromY) {
    let bestMatch = null;
    let bestEmpty = null;
    let bestMatchDist = Infinity;
    let bestEmptyDist = Infinity;
    
    for (const sp of state.stockpiles) {
        const stack = findStockpileStackAt(state, sp.x, sp.y);
        const dist = Math.abs(sp.x - fromX) + Math.abs(sp.y - fromY);
        
        if (stack) {
            // Stockpile has items - only match if same type
            if (stack.type === resourceType && dist < bestMatchDist) {
                bestMatch = sp;
                bestMatchDist = dist;
            }
        } else {
            // Empty stockpile - can accept any type
            if (dist < bestEmptyDist) {
                bestEmpty = sp;
                bestEmptyDist = dist;
            }
        }
    }
    
    // Prefer stockpiles with matching type, then empty ones
    return bestMatch || bestEmpty;
}

/**
 * Calculates total resources of a type in all stockpiles.
 */
export function getTotalStockpileResources(state, resourceType) {
    return state.itemStacks
        .filter(s => s.location === 'stockpile' && s.type === resourceType)
        .reduce((sum, s) => sum + s.amount, 0);
}

/**
 * Finds ground stacks that need to be hauled (no haul task assigned).
 */
export function findUnhauledGroundStacks(state) {
    return getGroundStacks(state).filter(stack => {
        // Check if there's already a haul task for this stack
        return !state.tasks.some(t => 
            t.type === 'haul' && t.stackId === stack.id
        );
    });
}
