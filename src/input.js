// ============================================
// INPUT HANDLING
// ============================================

import { CONFIG, FURNITURE } from './config.js';
import { createGatherTask, createBuildTask, createDemolishTask, createFurnitureTask, addTask } from './tasks.js';
import { getRoomAtTile } from './rooms.js';

/**
 * Sets up all input event listeners.
 */
export function setupInput(canvas, state, callbacks = {}) {
    setupMouseMove(canvas, state);
    setupMouseLeave(canvas, state);
    setupClick(canvas, state);
    setupContextMenu(canvas, state, callbacks);
    setupKeyboard(state, callbacks);
}

/**
 * Converts mouse event to tile coordinates.
 */
function getTileFromEvent(canvas, e) {
    const scaleX = canvas.width / canvas.offsetWidth;
    const scaleY = canvas.height / canvas.offsetHeight;
    
    return {
        x: Math.floor((e.offsetX * scaleX) / CONFIG.tileSize),
        y: Math.floor((e.offsetY * scaleY) / CONFIG.tileSize),
    };
}

/**
 * Mouse move - updates hover tile for build preview.
 */
function setupMouseMove(canvas, state) {
    canvas.addEventListener('mousemove', (e) => {
        state.ui.hoverTile = getTileFromEvent(canvas, e);
    });
}

/**
 * Mouse leave - clears hover tile.
 */
function setupMouseLeave(canvas, state) {
    canvas.addEventListener('mouseleave', () => {
        state.ui.hoverTile = null;
    });
}

/**
 * Click - gather or build depending on mode.
 */
function setupClick(canvas, state) {
    canvas.addEventListener('click', (e) => {
        const tile = getTileFromEvent(canvas, e);
        handleClick(state, tile.x, tile.y);
    });
}

/**
 * Processes a click at tile coordinates.
 */
function handleClick(state, tileX, tileY) {
    if (state.buildMode) {
        if (state.buildMode === 'demolish') {
            // Demolish mode - create demolish task
            const task = createDemolishTask(state, tileX, tileY);
            addTask(state, task);
        } else if (state.buildMode.startsWith('furniture_')) {
            // Furniture mode - place furniture in room
            const furnitureId = state.buildMode.replace('furniture_', '');
            const room = getRoomAtTile(state, tileX, tileY);
            if (room) {
                const task = createFurnitureTask(state, tileX, tileY, furnitureId, room);
                addTask(state, task);
            }
        } else {
            // Build mode - try to place building
            const task = createBuildTask(state, tileX, tileY, state.buildMode);
            addTask(state, task);
        }
    } else {
        // Normal mode - try to queue gather first
        const task = createGatherTask(state, tileX, tileY);
        if (task) {
            addTask(state, task);
        } else {
            // No gather task - check for room selection
            const room = getRoomAtTile(state, tileX, tileY);
            if (room) {
                // Toggle room selection
                if (state.ui.selectedRoom?.id === room.id) {
                    state.ui.selectedRoom = null;
                } else {
                    state.ui.selectedRoom = room;
                }
            } else {
                // Clicked outside any room - deselect
                state.ui.selectedRoom = null;
            }
        }
    }
}

/**
 * Right click - cancel build mode.
 */
function setupContextMenu(canvas, state, callbacks) {
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (callbacks.onBuildModeChange) {
            callbacks.onBuildModeChange(null);
        } else {
            state.buildMode = null;
        }
    });
}

/**
 * Keyboard - Escape cancels build mode.
 */
function setupKeyboard(state, callbacks) {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (callbacks.onBuildModeChange) {
                callbacks.onBuildModeChange(null);
            } else {
                state.buildMode = null;
            }
        }
    });
}
