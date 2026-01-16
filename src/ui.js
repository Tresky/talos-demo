// ============================================
// UI SYSTEM (DOM Updates)
// ============================================

import { BUILDINGS } from './config.js';
import { canAfford } from './state.js';
import { getStatusText } from './colonist.js';
import { getRoomInfo } from './rooms.js';

// Cache DOM elements
let elements = null;

/**
 * Initializes UI element cache.
 */
export function initUI() {
    elements = {
        woodCount: document.getElementById('wood-count'),
        stoneCount: document.getElementById('stone-count'),
        colonistList: document.getElementById('colonist-list'),
        status: document.getElementById('status'),
        roomInfo: document.getElementById('room-info'),
        buildButtons: {
            wall: document.getElementById('btn-wall'),
            floor: document.getElementById('btn-floor'),
            door: document.getElementById('btn-door'),
            stockpile: document.getElementById('btn-stockpile'),
            demolish: document.getElementById('btn-demolish'),
        },
    };
}

/**
 * Updates all UI elements to reflect current state.
 */
export function updateUI(state) {
    if (!elements) initUI();
    
    updateResourceDisplay(state);
    updateBuildButtons(state);
    updateColonistList(state);
    updateRoomInfo(state);
    updateStatusBar(state);
}

/**
 * Updates resource counters.
 */
function updateResourceDisplay(state) {
    elements.woodCount.textContent = state.resources.wood;
    elements.stoneCount.textContent = state.resources.stone;
}

/**
 * Updates build button states.
 */
function updateBuildButtons(state) {
    for (const [type, btn] of Object.entries(elements.buildButtons)) {
        const building = BUILDINGS[type];
        const affordable = building ? canAfford(state, building.cost) : true;
        
        btn.disabled = !affordable;
        btn.classList.toggle('active', state.buildMode === type);
    }
}

/**
 * Updates colonist list.
 */
function updateColonistList(state) {
    elements.colonistList.innerHTML = state.colonists.map(colonist => `
        <div class="colonist-item">
            <span>${colonist.name}</span>
            <span class="colonist-status">${getStatusText(colonist)}</span>
        </div>
    `).join('');
}

/**
 * Updates room info panel.
 */
function updateRoomInfo(state) {
    if (!elements.roomInfo) return;
    
    const room = state.ui.selectedRoom;
    const info = getRoomInfo(room);
    
    if (info) {
        elements.roomInfo.innerHTML = `
            <h2>🏠 Room Selected</h2>
            <div class="room-stats">
                <div class="room-stat">
                    <span class="label">Name</span>
                    <span class="value">${info.name}</span>
                </div>
                <div class="room-stat">
                    <span class="label">Size</span>
                    <span class="value">${info.size} tiles</span>
                </div>
                <div class="room-stat">
                    <span class="label">Dimensions</span>
                    <span class="value">${info.dimensions}</span>
                </div>
                <div class="room-stat">
                    <span class="label">Walls</span>
                    <span class="value">${info.wallCount}</span>
                </div>
            </div>
            <p class="room-hint">Click elsewhere to deselect</p>
        `;
        elements.roomInfo.style.display = 'block';
    } else {
        elements.roomInfo.innerHTML = '';
        elements.roomInfo.style.display = 'none';
    }
}

/**
 * Updates status bar.
 */
function updateStatusBar(state) {
    if (state.buildMode) {
        elements.status.textContent = `Build Mode: ${state.buildMode}`;
    } else if (state.tasks.length > 0) {
        elements.status.textContent = `${state.tasks.length} task(s) queued`;
    } else {
        elements.status.textContent = 'Ready';
    }
}

/**
 * Sets up build button click handlers.
 */
export function setupBuildButtons(state, onBuildModeChange) {
    if (!elements) initUI();
    
    for (const [type, btn] of Object.entries(elements.buildButtons)) {
        btn.addEventListener('click', () => {
            onBuildModeChange(state.buildMode === type ? null : type);
        });
    }
}
