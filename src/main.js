// ============================================
// TALOS DEMO - Main Entry Point
// ============================================

import { CONFIG } from './config.js';
import { createState } from './state.js';
import { generateMap } from './map.js';
import { spawnStartingColonists } from './colonist.js';
import { assignTasks } from './tasks.js';
import { updateColonists } from './systems.js';
import { render } from './renderer.js';
import { initUI, updateUI, setupBuildButtons, setupColonistControls } from './ui.js';
import { setupInput } from './input.js';

// ============================================
// INITIALIZATION
// ============================================

// Get canvas and context
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = CONFIG.mapWidth * CONFIG.tileSize;
canvas.height = CONFIG.mapHeight * CONFIG.tileSize;

// Create game state
const state = createState();

// Initialize world
generateMap(state);
spawnStartingColonists(state);

// Initialize UI
initUI();

// Build mode change handler
function setBuildMode(mode) {
    state.buildMode = mode;
}

// Setup input
setupInput(canvas, state, {
    onBuildModeChange: setBuildMode,
});

// Setup build buttons
setupBuildButtons(state, setBuildMode);

// Setup colonist controls (cancel buttons)
setupColonistControls(state);

// ============================================
// GAME LOOP
// ============================================

function gameLoop() {
    // Update
    assignTasks(state);
    updateColonists(state);
    
    // Render
    render(state, ctx);
    updateUI(state);
    
    // Next frame
    requestAnimationFrame(gameLoop);
}

// ============================================
// START GAME
// ============================================

console.log('Talos Demo initialized');
console.log(`Map: ${CONFIG.mapWidth}x${CONFIG.mapHeight} tiles`);
console.log(`Colonists: ${state.colonists.length}`);

gameLoop();
